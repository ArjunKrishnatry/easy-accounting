import { useState } from 'react';
import api from '../api';
import './SideTable.css';

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

interface SideTableProps {
    uploadedFiles: FileOrFolder[];
    onFileSelect: (fileId: string) => void;
    selectedFileId: string | null;
    onRefresh: () => void;
}

export default function SideTable({ uploadedFiles, onFileSelect, selectedFileId, onRefresh }: SideTableProps) {
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renamingFile, setRenamingFile] = useState<string | null>(null);
    const [newFileName, setNewFileName] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [showFolderDropdown, setShowFolderDropdown] = useState<string | null>(null);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        try {
            await api.post('/create-folder', {
                folder_name: newFolderName.trim()
            });
            setNewFolderName('');
            setShowCreateFolder(false);
            onRefresh();
        } catch (error) {
            console.error('Error creating folder:', error);
            alert('Failed to create folder');
        }
    };

    const handleRenameFile = async (fileId: string) => {
        if (!newFileName.trim()) return;

        try {
            await api.post('/rename-file', {
                file_id: fileId,
                new_name: newFileName.trim()
            });
            setNewFileName('');
            setRenamingFile(null);
            onRefresh();
        } catch (error) {
            console.error('Error renaming file:', error);
            alert('Failed to rename file');
        }
    };

    const handleMoveToFolder = async (fileId: string, folderId: string) => {
        try {
            await api.post('/move-file', {
                file_id: fileId,
                folder_id: folderId
            });
            setShowFolderDropdown(null);
            onRefresh();
        } catch (error) {
            console.error('Error moving file:', error);
            alert('Failed to move file to folder');
        }
    };

    const toggleFolder = (folderId: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    const getAvailableFolders = () => {
        return uploadedFiles.filter((item) => 'type' in item && item.type === 'folder') as FolderRecord[];
    };

    const renderFile = (file: FileRecord, isInFolder = false) => {
        const availableFolders = getAvailableFolders();
        const isInAnyFolder = uploadedFiles
            .filter(folderItem => 'type' in folderItem && folderItem.type === 'folder')
            .some(folder => (folder as FolderRecord).files.some(f => f.id === file.id));

        return (
            <div
                key={file.id}
                className={`file-item ${selectedFileId === file.id ? 'selected' : ''} ${isInFolder ? 'folder-file' : ''}`}
                onClick={() => onFileSelect(file.id)}
            >
                <div className="file-header">
                    <h3 className="file-name">{file.filename}</h3>
                    <div className="file-actions">
                        <span className="file-date">{new Date(file.uploadDate).toLocaleDateString()}</span>
                        <button
                            className="rename-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setRenamingFile(file.id);
                                setNewFileName(file.filename);
                            }}
                        >
                            ✏️
                        </button>
                        {!isInAnyFolder && availableFolders.length > 0 && (
                            <button
                                className="save-to-folder-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowFolderDropdown(showFolderDropdown === file.id ? null : file.id);
                                }}
                            >
                                📁
                            </button>
                        )}
                    </div>
                </div>
                <div className="file-stats">
                    <div className="stat">
                        <span className="stat-label">Records:</span>
                        <span className="stat-value">{file.totalRecords}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Expense:</span>
                        <span className="stat-value expense">${file.totalExpense.toFixed(2)}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Income:</span>
                        <span className="stat-value income">${file.totalIncome.toFixed(2)}</span>
                    </div>
                </div>
                {renamingFile === file.id && (
                    <div className="rename-form" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleRenameFile(file.id)}
                            autoFocus
                        />
                        <div className="rename-actions">
                            <button onClick={() => handleRenameFile(file.id)}>Save</button>
                            <button onClick={() => setRenamingFile(null)}>Cancel</button>
                        </div>
                    </div>
                )}
                {showFolderDropdown === file.id && (
                    <div className="folder-dropdown" onClick={(e) => e.stopPropagation()}>
                        <div className="dropdown-header">
                            <span>Save to folder:</span>
                            <button
                                className="close-dropdown-btn"
                                onClick={() => setShowFolderDropdown(null)}
                            >
                                ✕
                            </button>
                        </div>
                        {availableFolders.length === 0 ? (
                            <p className="no-folders">No folders available</p>
                        ) : (
                            <div className="folder-options">
                                {availableFolders.map(folder => (
                                    <button
                                        key={folder.id}
                                        className="folder-option"
                                        onClick={() => handleMoveToFolder(file.id, folder.id)}
                                    >
                                        📁 {folder.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderFolder = (folder: FolderRecord) => (
        <div key={folder.id} className="folder-item">
            <div
                className={`folder-header ${expandedFolders.has(folder.id) ? 'expanded' : ''}`}
                onClick={() => toggleFolder(folder.id)}
            >
                <span className="folder-icon">
                    {expandedFolders.has(folder.id) ? '📁' : '📂'}
                </span>
                <h3 className="folder-name">{folder.name}</h3>
                <span className="folder-count">({folder.files.length})</span>
            </div>
            {expandedFolders.has(folder.id) && (
                <div className="folder-contents">
                    {folder.files.map(file => renderFile(file, true))}
                </div>
            )}
        </div>
    );

    return (
        <div className="side-table-container">
            <div className="sidebar-header">
                <h2 className="text-lg font-semibold mb-4">Uploaded Files</h2>
                <button
                    className="create-folder-btn"
                    onClick={() => setShowCreateFolder(true)}
                >
                    📁 New Folder
                </button>
            </div>

            {showCreateFolder && (
                <div className="create-folder-form">
                    <input
                        type="text"
                        placeholder="Folder name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                        autoFocus
                    />
                    <div className="folder-actions">
                        <button onClick={handleCreateFolder}>Create</button>
                        <button onClick={() => setShowCreateFolder(false)}>Cancel</button>
                    </div>
                </div>
            )}

            <div className="files-list">
                {uploadedFiles.length === 0 ? (
                    <p className="text-gray-500 text-sm">No files uploaded yet</p>
                ) : (
                    <>
                        {/* Render folders as dropdowns */}
                        {uploadedFiles
                            .filter((item) => 'type' in item && item.type === 'folder')
                            .map((item) => renderFolder(item as FolderRecord))
                        }

                        {/* Render unassigned files (files not in any folder) */}
                        {uploadedFiles
                            .filter((item) => {
                                // Only show files that are not in any folder
                                if ('type' in item && item.type === 'folder') return false;

                                // Check if this file is in any folder
                                const fileId = (item as FileRecord).id;
                                const isInAnyFolder = uploadedFiles
                                    .filter(folderItem => 'type' in folderItem && folderItem.type === 'folder')
                                    .some(folder => (folder as FolderRecord).files.some(file => file.id === fileId));

                                return !isInAnyFolder;
                            })
                            .map((item) => renderFile(item as FileRecord))
                        }
                    </>
                )}
            </div>
        </div>
    );
}
