import { createContext, useContext, useState, useEffect } from "react";
import {API_BASE} from "../api";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/user/me`, { credentials: "include" })
            .then(r => r.json())
            .then(d => { if (d.status) setUser(d.user); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <UserContext.Provider value={{ user, loading, setUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);