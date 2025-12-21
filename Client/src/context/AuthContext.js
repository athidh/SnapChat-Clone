import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, signupUser } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [userToken, setUserToken] = useState(null);
    const [userInfo, setUserInfo] = useState(null);

    // Check if user is already logged in when app opens
    const isLoggedIn = async () => {
        try {
            setIsLoading(true);
            let token = await AsyncStorage.getItem('userToken');
            let user = await AsyncStorage.getItem('userInfo');
            
            if (token) {
                setUserToken(token);
                setUserInfo(JSON.parse(user));
            }
            setIsLoading(false);
        } catch (e) {
            console.log("Login Check Error", e);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        isLoggedIn();
    }, []);

    const login = async (email, password) => {
        setIsLoading(true);
        try {
            const res = await loginUser(email, password);
            const { token, data } = res.data;
            
            setUserToken(token);
            setUserInfo(data.user);

            await AsyncStorage.setItem('userToken', token);
            await AsyncStorage.setItem('userInfo', JSON.stringify(data.user));
        } catch (e) {
            console.log(e);
            alert("Login Failed: " + (e.response?.data?.message || "Server Error"));
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (username, email, password) => {
        setIsLoading(true);
        try {
            const res = await signupUser(username, email, password);
            const { token, data } = res.data;
            
            setUserToken(token);
            setUserInfo(data.user);

            await AsyncStorage.setItem('userToken', token);
            await AsyncStorage.setItem('userInfo', JSON.stringify(data.user));
        } catch (e) {
            alert("Signup Failed");
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        setUserToken(null);
        setUserInfo(null);
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userInfo');
        setIsLoading(false);
    };

    return (
        <AuthContext.Provider value={{ login, signup, logout, isLoading, userToken, userInfo }}>
            {children}
        </AuthContext.Provider>
    );
};