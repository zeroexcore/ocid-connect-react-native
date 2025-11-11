/*!
* Copyright 2024-Present Animoca Brands Corporation Ltd. 
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import { useOCAuth } from './OCContext';

const themes = {
    light: {
        backgroundColor: "#FFF",
        borderColor: "#DDDDEB", 
        textColor: "#C5C5D1",
    },
    dark: {
        backgroundColor: "#141414",
        borderColor: "#DDDDEB",
        textColor: "#FFFFFF",
    },
    neutral: {
        backgroundColor: "#F5F5F5",
        borderColor: "#DDDDEB",
        textColor: "#141414",
    },
    ocBlue: {
        backgroundColor: "#141BEB",
        borderColor: "#DDDDEB",
        textColor: "#FFFFFF",
    },
};

interface LoginButtonProps {
    pill?: boolean;
    disabled?: boolean;
    theme?: keyof typeof themes;
    state?: string;
    emailPlaceholder?: string;
}

export default function LoginButton({ pill, disabled, theme = 'ocBlue', state, emailPlaceholder }: LoginButtonProps) {
    const { ocAuth } = useOCAuth();
    const selectedTheme = themes[theme] || themes.ocBlue;

    const loginWithRedirect = async () => {
        if (ocAuth) {
            try {
                await ocAuth.signInWithRedirect({ state, emailPlaceholder });
            } catch (error: any) {
                if (error.message.includes('SANDBOX_VERIFICATION_REQUIRED')) {
                    // Handle sandbox verification error gracefully
                    console.warn('Sandbox verification required:', error.message);
                } else {
                    throw error; // Re-throw other errors
                }
            }
        }
    };

    const buttonStyle = [
        styles.button,
        {
            backgroundColor: selectedTheme.backgroundColor,
            borderColor: selectedTheme.borderColor,
            borderRadius: pill ? 22 : 8,
        },
        disabled && styles.disabled
    ];

    return (
        <TouchableOpacity
            style={buttonStyle}
            onPress={loginWithRedirect}
            disabled={disabled}
        >
            <Image 
                source={{ uri: 'https://static.opencampus.xyz/assets/oc_logo.svg' }}
                style={styles.logo}
            />
            <Text style={[styles.text, { color: selectedTheme.textColor }]}>
                Connect <Text style={styles.bold}>OCID</Text>
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        width: 160,
        paddingHorizontal: 12,
        borderWidth: 1,
        justifyContent: 'center',
    },
    disabled: {
        opacity: 0.6,
    },
    logo: {
        width: 26,
        height: 25,
        marginRight: 10,
    },
    text: {
        fontSize: 14,
    },
    bold: {
        fontWeight: 'bold',
    },
});
