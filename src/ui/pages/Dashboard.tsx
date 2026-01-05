import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FileUploader from '../components/FileUploader';
import TableView from '../components/TableView';
import DataView from '../components/DataView';
import ClassificationSelector from '../components/ClassificationSelector';
import SideTable from '../components/SideTable';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import api from '../api';

interface FileRecord {
  id: string;
  filename: string;
  uploadDate: string;
  totalRecords: number;
  totalExpense: number;
  totalIncome: number;
}

interface FolderRecord {
  id: string;
  type: 'folder';
  name: string;
  createdDate: string;
  files: FileRecord[];
}

type FileOrFolder = FileRecord | FolderRecord;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [showTableView, setShowTableView] = useState(true);
  const [showClassifier, setShowClassifier] = useState(false);
  const [remaningclassifications, setRemaningClassifications] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileOrFolder[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    itemId: string;
    itemName: string;
    itemType: 'file' | 'folder';
    folderFileCount?: number;
  }>({
    isOpen: false,
    itemId: '',
    itemName: '',
    itemType: 'file'
  });

  // Load stored files on component mount
  useEffect(() => {
    loadStoredFiles();
  }, []);

  const loadStoredFiles = async () => {
    try {
      const response = await api.get('/stored-files');
      setUploadedFiles(response.data);
    } catch (error) {
      console.error('Error loading stored files:', error);
    }
  };

  const handleFileSelect = async (fileId: string) => {
    try {
      const response = await api.get(`/file-data/${fileId}`);
      if (response.data.data) {
        setParsedData(response.data.data);
        setSelectedFileId(fileId);
        setShowClassifier(false);
      }
    } catch (error) {
      console.error('Error loading file data:', error);
    }
  };

  const handleFileUpload = async (fileData: any, fileId?: string) => {
    setParsedData(fileData);
    if (fileId) {
      setSelectedFileId(fileId);
    }
    // Reload the file list to show the new file
    await loadStoredFiles();
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleDeleteClick = (id: string, type: 'file' | 'folder') => {
    // Find the item to get its name
    const item = uploadedFiles.find(f => f.id === id);
    if (!item) return;

    const itemName = 'type' in item && item.type === 'folder' ? item.name : (item as FileRecord).filename;
    const folderFileCount = 'type' in item && item.type === 'folder' ? item.files.length : 0;

    setDeleteModal({
      isOpen: true,
      itemId: id,
      itemName,
      itemType: type,
      folderFileCount
    });
  };

  const handleDeleteSuccess = () => {
    loadStoredFiles();
    // Clear selection if the deleted item was selected
    if (deleteModal.itemId === selectedFileId) {
      setSelectedFileId(null);
      setParsedData([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 fixed top-0 left-0 right-0 z-50 shadow-sm w-full">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">EasyAccounting</h1>
                <p className="text-sm text-slate-500">Financial Management</p>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">Welcome, {user?.name}!</p>
                <p className="text-xs text-slate-500">Manage your finances</p>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center justify-center p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors duration-200"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 mt-[88px]">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* File Upload Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Upload Financial Data</h2>
            <FileUploader
              setParsedData={handleFileUpload}
              setShowClassifier={setShowClassifier}
              setRemaningClassifications={setRemaningClassifications}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - File List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Files</h2>
                <SideTable
                  uploadedFiles={uploadedFiles}
                  onFileSelect={handleFileSelect}
                  selectedFileId={selectedFileId}
                  onRefresh={loadStoredFiles}
                  onDelete={handleDeleteClick}
                />
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                {/* View Toggle */}
                {!showClassifier && parsedData.length > 0 && (
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {showTableView ? 'Transaction Table' : 'Data Visualization'}
                    </h2>
                    <button
                      onClick={() => setShowTableView(!showTableView)}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 font-medium"
                    >
                      {showTableView ? 'Show Charts' : 'Show Table'}
                    </button>
                  </div>
                )}

                {/* Content Display */}
                {showClassifier ? (
                  <ClassificationSelector
                    setShowClassifier={setShowClassifier}
                    RemainingClassifications={remaningclassifications}
                    setParsedData={setParsedData}
                    parsedData={parsedData}
                  />
                ) : parsedData.length > 0 ? (
                  showTableView ? (
                    <TableView data={parsedData} />
                  ) : (
                    <div className="min-h-[400px]">
                      <DataView data={parsedData} />
                    </div>
                  )
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No data selected</h3>
                    <p className="mt-1 text-sm text-slate-500">Upload a file or select one from the sidebar to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onSuccess={handleDeleteSuccess}
        itemType={deleteModal.itemType}
        itemName={deleteModal.itemName}
        itemId={deleteModal.itemId}
        folderFileCount={deleteModal.folderFileCount}
      />
    </div>
  );
}
