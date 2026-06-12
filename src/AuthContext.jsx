import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [username, setUsername] = useState(
    () => sessionStorage.getItem("ongc_user") || ""
  );
  const [password, setPassword] = useState(
    () => sessionStorage.getItem("ongc_pass") || ""
  );

  const login = (user, pass) => {
    sessionStorage.setItem("ongc_user", user);
    sessionStorage.setItem("ongc_pass", pass);
    setUsername(user);
    setPassword(pass);
  };

  const logout = () => {
    sessionStorage.removeItem("ongc_user");
    sessionStorage.removeItem("ongc_pass");
    setUsername("");
    setPassword("");
  };

  return (
    <AuthContext.Provider value={{ username, password, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}