'use client';

import React, { createContext, useContext } from 'react';

import { useLocalStorage } from 'usehooks-ts';

export interface S3Config {
  accessKeyID: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
}

interface S3ConfigContext {
  config: S3Config | null;
  setConfig: (config: S3Config) => void;
  clearConfig: () => void;
}

const S3ConfigContext = createContext<S3ConfigContext | null>(null);

const S3_CONFIG_STORAGE_KEY = 'bitvolt-s3config';

export const S3ConfigProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [config, setConfig, clearConfig] = useLocalStorage<S3Config | null>(
    S3_CONFIG_STORAGE_KEY,
    null
  );

  return (
    <S3ConfigContext.Provider value={{ config, setConfig, clearConfig }}>
      {children}
    </S3ConfigContext.Provider>
  );
};

export function useS3Config(): S3ConfigContext {
  const context = useContext(S3ConfigContext);

  if (!context) {
    throw new Error("useS3Config must be used within a 'S3ConfigProvider'");
  }

  return context;
}
