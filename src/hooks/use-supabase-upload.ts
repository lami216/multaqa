import React from 'react';

export type UploadError = {
  name: string;
  message?: string;
};

export type UploadFile = {
  name: string;
  type: string;
  preview?: string;
  size?: number;
  errors: UploadError[];
};

export type UseSupabaseUploadReturn = {
  files: UploadFile[];
  setFiles: (files: UploadFile[]) => void;
  onUpload: () => void;
  loading: boolean;
  successes: string[];
  errors: UploadError[];
  maxFileSize: number;
  maxFiles: number;
  inputRef?: React.RefObject<HTMLInputElement>;
  isDragActive: boolean;
  isDragReject: boolean;
  isSuccess: boolean;
  getRootProps: (props?: Record<string, unknown>) => Record<string, unknown>;
  getInputProps: () => Record<string, unknown>;
};
