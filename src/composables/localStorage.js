
export function useLocalStorage() {

    const getJsonToLocalStorage = async(key) => {
        await null;
        return JSON.parse( localStorage.getItem(key))
    };

    const setJsonToLocalStorage = async(key, data) => {
        await null;
        return localStorage.setItem( key, JSON.stringify(data) )
    };

    return {
        getJsonToLocalStorage,
        setJsonToLocalStorage
    }
}
