import { createContext, useContext, useEffect } from "react";
import echo, { updateEchoToken } from "../services/echo";
import { getToken } from "../services/api";

const EchoContext = createContext(null);

export const EchoProvider = ({ children }) => {
  useEffect(() => {
    updateEchoToken(getToken());
  }, []);

  return (
    <EchoContext.Provider value={echo}>
      {children}
    </EchoContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useEcho = () => {
  return useContext(EchoContext);
};
