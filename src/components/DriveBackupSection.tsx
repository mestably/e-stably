/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  Cloud,
  Folder,
  Calendar,
  Trash2,
  RefreshCw,
  Download,
  LogOut,
  AlertCircle,
  CheckCircle,
  Database,
  Save,
  Shield,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  initDriveAuth,
  googleDriveSignIn,
  driveLogout,
  listBackups,
  createBackup,
  downloadBackup,
  deleteBackup,
  BackupFile,
} from '../lib/drive';
import { FirebaseService } from '../lib/firebase';
import ConfirmModal from './ConfirmModal';

export default function DriveBackupSection() {
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);

  // Note for the backup creation
  const [backupNote, setBackupNote] = useState('');
  
  // Status states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  // Modals confirmation state
  const [restoreConfirmFile, setRestoreConfirmFile] = useState<BackupFile | null>(null);
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<BackupFile | null>(null);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        setNeedsAuth(false);
        loadBackupsList();
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    try {
      const result = await googleDriveSignIn();
      if (result) {
        setGoogleUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
        setSuccess('تم ربط حساب Google Drive بنجاح!');
        setTimeout(() => setSuccess(''), 3000);
        
        // Load backups list directly
        setIsLoadingBackups(true);
        try {
          const files = await listBackups();
          setBackups(files);
        } catch (e: any) {
          console.error(e);
        } finally {
          setIsLoadingBackups(false);
        }
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      setError('فشل الاتصال بحساب Google. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await driveLogout();
      setGoogleUser(null);
      setAccessToken(null);
      setNeedsAuth(true);
      setBackups([]);
      setSuccess('تم إلغاء ربط الحساب بنجاح.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تسجيل الخروج.');
    }
  };

  const loadBackupsList = async () => {
    setIsLoadingBackups(true);
    setError('');
    try {
      const files = await listBackups();
      setBackups(files);
    } catch (err: any) {
      console.error(err);
      setError('فشل جلب قائمة النسخ الاحتياطية من حساب Google Drive الخاص بك.');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setError('');
    setSuccess('');
    try {
      // 1. Fetch current data from Firebase RTDB & local caching fallback
      const stables = await FirebaseService.getStables();
      const horses = await FirebaseService.getHorses();
      const shelters = await FirebaseService.getShelters();
      const transports = await FirebaseService.getTransports();
      const users = await FirebaseService.getUsers();
      const chats = await FirebaseService.getChats();

      const backupPayload = {
        app: 'horses_forum_arabian',
        version: '1.0',
        backupDate: new Date().toISOString(),
        note: backupNote,
        data: {
          stables,
          horses,
          shelters,
          transports,
          users,
          chats,
        },
      };

      // 2. Upload to Google Drive
      await createBackup(backupPayload, backupNote);
      
      setBackupNote('');
      setSuccess('تم إنشاء النسخة الاحتياطية السحابية وحفظها على Google Drive بنجاح!');
      setTimeout(() => setSuccess(''), 4000);

      // 3. Reload list
      await loadBackupsList();
    } catch (err: any) {
      console.error(err);
      setError('فشل إنشاء النسخة الاحتياطية. تأكد من توفر اتصال مستقر بالإنترنت وصلاحيات حسابك.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreConfirmFile) return;
    const fileId = restoreConfirmFile.id;
    setRestoreConfirmFile(null);
    setIsLoadingBackups(true);
    setError('');
    setSuccess('');
    
    try {
      // 1. Download backup content
      const payload = await downloadBackup(fileId);
      
      // Verification check
      if (!payload || payload.app !== 'horses_forum_arabian' || !payload.data) {
        throw new Error('الملف المحدد لا يحتوي على تنسيق نسخة احتياطية صالح للمنصة.');
      }

      const { stables, horses, shelters, transports, users, chats } = payload.data;

      // 2. Clear deleted tracking to start fresh
      localStorage.removeItem('horses_forum_deleted_ids');

      // 3. Write directly to local storage / local cache
      const setLocalData = (key: string, items: any[]) => {
        if (Array.isArray(items)) {
          localStorage.setItem(`horses_forum_${key}`, JSON.stringify(items));
        }
      };

      setLocalData('stables', stables || []);
      setLocalData('horses', horses || []);
      setLocalData('shelters', shelters || []);
      setLocalData('transports', transports || []);
      setLocalData('users', users || []);
      setLocalData('chats', chats || []);

      // 4. Force synchronization back to cloud (Firebase RTDB)
      const syncNode = async (nodeName: string, items: any[]) => {
        if (Array.isArray(items)) {
          for (const item of items) {
            await fetch(`https://horses-835f1-default-rtdb.asia-southeast1.firebasedatabase.app/${nodeName}/${item.id}.json`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            });
          }
        }
      };

      await syncNode('stables', stables || []);
      await syncNode('horses', horses || []);
      await syncNode('shelters', shelters || []);
      await syncNode('transports', transports || []);
      await syncNode('users', users || []);
      await syncNode('chats', chats || []);

      setSuccess('تهانينا! تم استعادة جميع بيانات المنصة بالكامل وبنجاح من النسخة الاحتياطية.');
      setTimeout(() => {
        setSuccess('');
        // Reload page to refresh all sections
        window.location.reload();
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'فشل استيراد واستعادة البيانات.');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!deleteConfirmFile) return;
    const fileId = deleteConfirmFile.id;
    setDeleteConfirmFile(null);
    setIsLoadingBackups(true);
    setError('');
    
    try {
      await deleteBackup(fileId);
      setSuccess('تم حذف ملف النسخة الاحتياطية نهائياً من حساب Google Drive بنجاح.');
      setTimeout(() => setSuccess(''), 3000);
      await loadBackupsList();
    } catch (err: any) {
      console.error(err);
      setError('فشل حذف ملف النسخة الاحتياطية.');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const formatSize = (bytesStr?: string) => {
    if (!bytesStr) return 'غير معروف';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return 'غير معروف';
    if (bytes < 1024) return `${bytes} بابت`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} ك.ب`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} م.ب`;
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Section Intro Banner */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-start gap-4">
        <div className="p-3 bg-blue-50 text-navy rounded-xl shrink-0">
          <Cloud className="w-6 h-6 text-navy" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-navy leading-tight">النسخ الاحتياطي واستعادة البيانات (Google Drive)</h2>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            حافظ على أمان بيانات المنصة (الخيول، الإسطبلات، خدمات الإيواء، طلبات النقل والتعليقات). يمكنك ربط حسابك في Google Drive لإنشاء نسخ احتياطية واسترجاعها في أي وقت بنقرة واحدة لحماية أعمالك من الضياع أو لترحيل البيانات.
          </p>
        </div>
      </div>

      {/* Global Status Banner Messages */}
      {error && (
        <div className="p-3 bg-red-50 border-r-4 border-red-500 text-red-700 text-xs rounded-l flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border-r-4 border-green-500 text-green-700 text-xs rounded-l flex items-start gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Google Integration & Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Account Connection & Trigger Backup */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Account Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-navy text-xs border-b border-slate-50 pb-2">حالة الاتصال بالسحاب</h3>
            
            {needsAuth ? (
              <div className="space-y-4 pt-1">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  الرجاء تسجيل الدخول باستخدام حساب Google لتمكين المنصة من كتابة وقراءة ملفات النسخ الاحتياطية المشفرة والآمنة الخاصة بك.
                </p>
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-2.5 bg-navy hover:bg-navy-dark text-white font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  )}
                  <span>ربط حساب Google Drive</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                  {googleUser?.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt="Google User"
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-navy text-white font-bold flex items-center justify-center text-sm">
                      {googleUser?.displayName?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {googleUser?.displayName || 'حساب Google متصل'}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {googleUser?.email}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={loadBackupsList}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs transition cursor-pointer font-bold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>تحديث القائمة</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 py-2 px-3 rounded-xl text-xs transition cursor-pointer font-bold"
                    title="إلغاء ربط الحساب"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>فصل</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Trigger Backup Form Card */}
          {!needsAuth && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-navy text-xs border-b border-slate-50 pb-2 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-gold" />
                <span>إنشاء نسخة احتياطية جديدة</span>
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    ملاحظة اختيارية للنسخة (مثال: قبل تعديل التصميم)
                  </label>
                  <input
                    type="text"
                    value={backupNote}
                    onChange={(e) => setBackupNote(e.target.value)}
                    placeholder="اكتب ملاحظة لتمييز هذه النسخة..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-navy"
                  />
                </div>

                <button
                  onClick={handleCreateBackup}
                  disabled={isCreatingBackup}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isCreatingBackup ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>ابدأ النسخ الاحتياطي الآن</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right column (take up remaining 2 cols): Backups List */}
        <div className="lg:col-span-2">
          
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4 min-h-[300px] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <h3 className="font-bold text-navy text-xs flex items-center gap-2">
                <Folder className="w-4 h-4 text-navy" />
                <span>قائمة النسخ السحابية المتوفرة</span>
                {!needsAuth && (
                  <span className="bg-blue-50 text-navy font-mono text-[9px] px-2 py-0.5 rounded-full font-bold">
                    {backups.length} نسخة
                  </span>
                )}
              </h3>
            </div>

            {needsAuth ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="p-3 bg-slate-50 text-slate-400 rounded-full">
                  <Shield className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-slate-600">تسجيل الدخول مطلوب</h4>
                  <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                    يرجى ربط حساب Google Drive الخاص بك لعرض واسترجاع النسخ الاحتياطية المسجلة.
                  </p>
                </div>
              </div>
            ) : isLoadingBackups ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
                <RefreshCw className="w-8 h-8 text-navy animate-spin" />
                <span className="text-[10px] text-slate-500">جاري تحميل النسخ الاحتياطية من سحابة Google...</span>
              </div>
            ) : backups.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="p-3 bg-slate-50 text-slate-400 rounded-full">
                  <Database className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-slate-600">لا توجد نسخ احتياطية</h4>
                  <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                    لم تقم بإنشاء أي نسخة احتياطية سحابية بعد. استخدم الحقل الأيمن لبدء حماية بياناتك الآن.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[450px] pr-1">
                {backups.map((file) => (
                  <div
                    key={file.id}
                    className="p-4 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    
                    {/* File Meta */}
                    <div className="space-y-1 text-right flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-navy truncate" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-mono">
                          {formatSize(file.size)}
                        </span>
                      </div>
                      
                      {file.description && (
                        <p className="text-[10px] text-slate-600 font-medium">
                          {file.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1 text-[9px] text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(file.createdTime)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0 sm:self-center">
                      <button
                        onClick={() => setRestoreConfirmFile(file)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-navy hover:bg-navy-dark text-white font-bold py-2 px-3 rounded-xl text-[10px] transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>استعادة البيانات</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmFile(file)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition cursor-pointer"
                        title="حذف النسخة من Drive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Confirmation Dialog Modals */}
      <ConfirmModal
        isOpen={restoreConfirmFile !== null}
        title="تأكيد استعادة النسخة الاحتياطية"
        message={`هل أنت متأكد من رغبتك في استعادة البيانات من ملف "${restoreConfirmFile?.name || ''}"؟ سيتم استبدال جميع الإعلانات، الإسطبلات، والبيانات الحالية على المنصة بالبيانات الموجودة في هذا الملف بالكامل.`}
        confirmText="نعم، ابدأ الاستعادة"
        cancelText="إلغاء"
        onConfirm={handleRestoreBackup}
        onCancel={() => setRestoreConfirmFile(null)}
      />

      <ConfirmModal
        isOpen={deleteConfirmFile !== null}
        title="تأكيد حذف ملف النسخة الاحتياطية"
        message={`هل أنت متأكد من رغبتك في حذف ملف النسخة "${deleteConfirmFile?.name || ''}" نهائياً من حساب Google Drive الخاص بك؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="نعم، احذف الملف"
        cancelText="إلغاء"
        onConfirm={handleDeleteBackup}
        onCancel={() => setDeleteConfirmFile(null)}
      />

    </div>
  );
}
