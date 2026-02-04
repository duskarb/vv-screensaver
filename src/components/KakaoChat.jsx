import { useEffect, useState } from 'react';
import { ref, onValue, query, limitToLast } from 'firebase/database';
import { db } from '../firebase';

export default function KakaoChat() {
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const messagesRef = query(ref(db, 'messages'), limitToLast(10));
        
        const unsubscribe = onValue(messagesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedMessages = Object.entries(data).map(([key, value]) => ({
                    id: key,
                    ...value
                }));
                // Sort by timestamp if available, otherwise rely on insertion order (keys)
                // Firebase push keys are chronologically ordered.
                setMessages(loadedMessages);
            } else {
                setMessages([]);
            }
        });

        return () => unsubscribe();
    }, []);

    if (messages.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '320px',
            maxHeight: '400px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            padding: '16px',
            overflowY: 'auto',
            zIndex: 9999,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
        }}>
            <h3 style={{ 
                margin: '0 0 12px 0', 
                fontSize: '0.9rem', 
                color: '#666',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}>
                <span style={{ 
                    display: 'inline-block', 
                    width: '8px', 
                    height: '8px', 
                    background: '#FEE500', 
                    borderRadius: '50%' 
                }}></span>
                KakaoTalk Messages
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.map((msg) => (
                    <div key={msg.id} style={{ 
                        padding: '10px 12px', 
                        background: '#FEE500', 
                        borderRadius: '12px',
                        borderTopLeftRadius: '2px',
                        fontSize: '0.9rem',
                        alignSelf: 'flex-start',
                        color: '#191919',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        maxWidth: '90%',
                        lineHeight: '1.4'
                    }}>
                        {msg.text}
                    </div>
                ))}
            </div>
        </div>
    );
}
