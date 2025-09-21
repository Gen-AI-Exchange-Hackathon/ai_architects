"use client";

import React, { useState, useCallback, useEffect } from 'react';
import styles from './StartupInputPanel.module.css';
import { FileUp, Loader2, CheckCircle, XCircle } from "lucide-react";

const UploadIcon = () => (
  <FileUp size={40} strokeWidth={2} className="text-gray-500" />
);

const LoadingSpinner = () => (
  <Loader2 size={32} className={styles.spinner} />
);

const SuccessIcon = () => (
  <CheckCircle size={40} className={styles.successIcon} />
);

const ErrorIcon = () => (
  <XCircle size={40} className={styles.errorIcon} />
);

export default function StartupInputPanel({ onNewAnalysis, selectedSession, user ,sessionId}) {
  const [startupData, setStartupData] = useState({
    name: '',
    website: '',
    pitch: '',
    targetMarket: '',
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const [modalState, setModalState] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(null);

  useEffect(() => {
    if (selectedSession) {
      setStartupData({
        name: selectedSession.name || '',
        website: selectedSession.website || '',
        pitch: selectedSession.pitch || '',
        targetMarket: selectedSession.targetMarket || '',
      });

      
      setUploadedFiles(
        (selectedSession.files || []).map(file => ({
          file: null,
          name: file.name,
          path: file.path || "#",
        }))
      );
    } else {
      setStartupData({
        name: '',
        website: '',
        pitch: '',
        targetMarket: '',
      });
      setUploadedFiles([]);
    }
  }, [selectedSession]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStartupData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleFiles = useCallback((files) => {
    const MAX_FILES = 3;
    const incomingFiles = Array.from(files);
    
    const uniqueNewFiles = incomingFiles
        .filter(file => 
            !uploadedFiles.some(existingFile => 
                existingFile.name === file.name
            )
        );
  
    if (uniqueNewFiles.length < incomingFiles.length) {
      alert("One or more files were not added because a file with the same name already exists.");
    }

    if (uploadedFiles.length >= MAX_FILES) {
      alert(`You can only upload a maximum of ${MAX_FILES} files.`);
      return;
    }

    const availableSlots = MAX_FILES - uploadedFiles.length;
    const filesToUpload = uniqueNewFiles.slice(0, availableSlots);

    if (uniqueNewFiles.length > filesToUpload.length) {
      alert(`You can only upload a maximum of ${MAX_FILES} files. Some of your selected files were not added.`);
    }

    if (filesToUpload.length > 0) {
      const processedFiles = filesToUpload.map(file => ({ file, name: file.name, size: file.size }));
      setUploadedFiles(prev => [...prev, ...processedFiles]);
    }
  }, [uploadedFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (fileName) => {
    setUploadedFiles(prev => prev.filter(item => item.name !== fileName));
  };

  const handleConfirmSubmit = (e) => {
    e.preventDefault();
    setModalState('confirm');
  };

//   const handleFinalSubmit = async () => {
//     setModalState('loading');

//     if (!user) {
//       setFeedbackMessage('Authentication failed. Please log in.');
//       setIsSuccess(false);
//       setModalState('result');
//       return;
//     }
//     const idToken = await user.getIdToken();

//     if (!sessionId) {
//       setFeedbackMessage('No active session found. Please start a new session.');
//       setIsSuccess(false);
//       setModalState('result');
//       return;
// }


//     const formData = new FormData();
//     formData.append('sessionId', session.id);
//     formData.append('name', startupData.name);
//     formData.append('website', startupData.website);
//     formData.append('pitch', startupData.pitch);
//     formData.append('targetMarket', startupData.targetMarket);

//     const newFilesToUpload = uploadedFiles.filter(item => item.file !== null);
//     newFilesToUpload.forEach(item => {
//         formData.append('documents', item.file);
//     });

//     try {
//       const response = await fetch('/api/upload', {
//         method: 'POST',
//         headers: {
//             'Authorization': `Bearer ${idToken}`,
//         },
//         body: formData,
//       });

//       if (response.ok) {
//         const result = await response.json();
        
//         const filesWithPaths = newFilesToUpload.map((item, idx) => ({
//             name: item.name,
//             path: result.paths?.[idx] || '#',
//             file: null,
//         }));

//         setUploadedFiles([]); 

//         setFeedbackMessage('Data uploaded successfully!');
//         setIsSuccess(true);

//         if (onNewAnalysis) {
//           onNewAnalysis({
//             name: startupData.name,
//             website: startupData.website,
//             pitch: startupData.pitch,
//             targetMarket: startupData.targetMarket,
//             files: filesWithPaths,
//             status: 'in-progress',
//           });
//         }
//       } else {
//         const errorData = await response.json();
//         setFeedbackMessage(`Upload failed: ${errorData.message || 'An error occurred'}`);
//         setIsSuccess(false);
//       }
//     } catch (error) {
//       setFeedbackMessage('An unexpected error occurred. Please try again.');
//       setIsSuccess(false);
//     } finally {
//       setModalState('result');
//     }
//   };

// inside StartupInputPanel.js

const handleFinalSubmit = async () => {
  setModalState('loading');

  if (!user) {
    setFeedbackMessage('Authentication failed. Please log in.');
    setIsSuccess(false);
    setModalState('result');
    return;
  }

  // 🔑 send everything to parent (HomePage)
  try {
    await onNewAnalysis(startupData, uploadedFiles);
    setUploadedFiles([]); // clear local files
    setFeedbackMessage('Data uploaded successfully!');
    setIsSuccess(true);
  } catch (error) {
    console.error(error);
    setFeedbackMessage(error.message || 'An unexpected error occurred.');
    setIsSuccess(false);
  } finally {
    setModalState('result');
  }
};


  const renderModalContent = () => {
    switch (modalState) {
      case 'confirm':
        return (
          <>
            <h3>Review & Confirm Submission</h3>
            <p>Please review the data below before submitting.</p>
            <div className={styles.reviewContent}>
              <p><strong>Startup:</strong> {startupData.name || 'Not provided'}</p>
              <p><strong>Website:</strong> {startupData.website || 'Not provided'}</p>
              <p><strong>Pitch:</strong> {startupData.pitch || 'Not provided'}</p>
              <p><strong>Target Market:</strong> {startupData.targetMarket || 'Not provided'}</p>
              {uploadedFiles.length > 0 && (
                <>
                  <p><strong>Uploaded Files:</strong></p>
                  <ul>
                    {uploadedFiles.map((file, index) => (
                      <li key={index}>
                        <span>{file.name}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className={styles.dialogActions}>
              <button onClick={() => setModalState(null)} className={styles.cancelButton}>
                Cancel
              </button>
              <button onClick={handleFinalSubmit} className={styles.confirmButton}>
                Confirm & Analyze
              </button>
            </div>
          </>
        );
      case 'loading':
        return (
          <div className={styles.centeredContent}>
            <LoadingSpinner />
            <p>Analyzing your startup data...</p>
            <p className={styles.smallText}>This may take a few moments.</p>
          </div>
        );
      case 'result':
        return (
          <div className={styles.centeredContent}>
            {isSuccess ? <SuccessIcon /> : <ErrorIcon />}
            <p className={`${styles.feedback} ${isSuccess ? styles.success : styles.error}`}>
              {feedbackMessage}
            </p>
            <div className={styles.dialogActions}>
              <button
                onClick={() => {
                  setModalState(null);
                }}
                className={styles.confirmButton}
              >
                Close
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

return (
    <div className={styles.inputPanel}>
        <h2>Evaluate Startup</h2>
        <p className={styles.subtitle}>
            Provide the details and documents below to generate an analysis.
        </p>

        <form onSubmit={handleConfirmSubmit} className={styles.startupForm}>
            <div className={styles.formSection}>
                <label htmlFor="name">Startup Name</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    value={startupData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., QuantumLeap AI"
                    required
                />
            </div>

            {/* <div className={styles.formSection}>
                <label htmlFor="website">Website URL</label>
                <input
                    type="url"
                    id="website"
                    name="website"
                    value={startupData.website}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                />
            </div> */}

            {/* <div className={styles.formSection}>
                <label htmlFor="pitch">One-Liner Pitch</label>
                <textarea
                    id="pitch"
                    name="pitch"
                    rows="3"
                    value={startupData.pitch}
                    onChange={handleInputChange}
                    placeholder="Describe the startup in a single sentence."
                />
            </div> */}

            <div className={styles.formSection}>
                <label htmlFor="targetMarket">Target Market</label>
                <textarea
                    id="targetMarket"
                    name="targetMarket"
                    rows="3"
                    value={startupData.targetMarket}
                    onChange={handleInputChange}
                    placeholder="Who are the primary customers?"
                />
            </div>

            <div className={styles.formSection}>
                <label>Upload Documents (Pitch Deck, etc.)</label>
                <div
                    className={`${styles.fileDropZone} ${isDragging ? styles.dragging : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => document.getElementById('fileInput').click()}
                >
                    <input
                        type="file"
                        id="fileInput"
                        multiple
                        hidden
                        onChange={handleFileSelect}
                        accept=".pdf,.ppt,.pptx,.doc,.docx"
                    />
                    <div className={styles.dropZoneContent}>
                        <UploadIcon />
                        <p><b>Click to browse</b> or drag and drop</p>
                        <p className={styles.fileTypes}>Supports: PDF, PPT, DOCX</p>
                    </div>
                </div>
            </div>

            {uploadedFiles.length > 0 && (
                <div className={styles.fileList}>
                    <h4>Uploaded Files:</h4>
                    <ul>
                        {uploadedFiles.map((file, index) => (
                            <li key={index}>
                                <span>{file.name}</span>
                                <button type="button" onClick={() => removeFile(file.name)}>
                                    &times;
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <button type="submit" className={styles.submitButton}>
                Analyze Startup
            </button>
        </form>

        {modalState && (
            <div className={styles.confirmationDialogBackdrop}>
                <div className={styles.confirmationDialog}>
                    {renderModalContent()}
                </div>
            </div>
        )}
    </div>
);
}