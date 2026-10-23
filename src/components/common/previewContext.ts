import { createContext, useContext } from 'react';

/** True inside a preview module opened from a signed-in account (sample data, nothing saved). */
export const PreviewContext = createContext(false);

export const useIsPreview = () => useContext(PreviewContext);
