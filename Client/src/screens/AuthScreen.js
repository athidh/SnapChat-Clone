import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function AuthScreen() {
    const { login, signup, isLoading } = useContext(AuthContext);
    const [isLogin, setIsLogin] = useState(true);
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');

    const handleSubmit = () => {
        if (isLogin) {
            login(email, password);
        } else {a
            signup(username, email, password);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>{isLogin ? 'Snap Login' : 'Create Account'}</Text>
            
            {!isLogin && (
                <TextInput 
                    placeholder="Username" 
                    style={styles.input} 
                    placeholderTextColor="#666"
                    value={username}
                    onChangeText={setUsername}
                />
            )}
            <TextInput 
                placeholder="Email" 
                style={styles.input} 
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
            />
            <TextInput 
                placeholder="Password" 
                style={styles.input} 
                placeholderTextColor="#666"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>{isLogin ? 'Login' : 'Sign Up'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{marginTop: 20}}>
                <Text style={styles.linkText}>
                    {isLogin ? "New here? Create Account" : "Already have an account? Login"}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFC00', justifyContent: 'center', padding: 20 },
    header: { fontSize: 32, fontWeight: 'bold', marginBottom: 40, textAlign: 'center' },
    input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
    btn: { backgroundColor: 'black', padding: 15, borderRadius: 30, alignItems: 'center', marginTop: 10 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    linkText: { color: 'black', textAlign: 'center', fontWeight: '500' }
});