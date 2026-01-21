
export const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const setToken = (token: string, remember: boolean) => {
    if (typeof window === 'undefined') return;
    if (remember) {
        localStorage.setItem('token', token);
        sessionStorage.removeItem('token');
    } else {
        sessionStorage.setItem('token', token);
        localStorage.removeItem('token');
    }
};

export const removeToken = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
};

export const getUser = (): any | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};

export const setUser = (user: any, remember: boolean) => {
    if (typeof window === 'undefined') return;
    const userStr = JSON.stringify(user);
    if (remember) {
        localStorage.setItem('user', userStr);
        sessionStorage.removeItem('user');
    } else {
        sessionStorage.setItem('user', userStr);
        localStorage.removeItem('user');
    }
};

export const updateUser = (user: any) => {
    if (typeof window === 'undefined') return;
    const userStr = JSON.stringify(user);
    if (localStorage.getItem('token')) {
        localStorage.setItem('user', userStr);
    } else {
        sessionStorage.setItem('user', userStr);
    }
}

export const removeUser = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
};
