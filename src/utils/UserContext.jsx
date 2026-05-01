import { createContext, useContext, useState, useEffect } from "react";
import { API_BASE } from "../api";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuth, setIsAuth] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/v1/user/me`, { credentials: "include" })
            .then(r => r.json())
            .then(d => {
                setIsAuth(d.status === true);
                if (d.status) setUser(d);
            })
            .catch(() => setIsAuth(false))
            .finally(() => setLoading(false));
    }, []);

    return (
        <UserContext.Provider value={{ user, isAuth, loading, setUser, setIsAuth }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);