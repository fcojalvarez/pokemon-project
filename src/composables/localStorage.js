
export function useLocalStorage() {

    const getJsonToLocalStorage = (key) => JSON.parse( localStorage.getItem(key) );

    const setJsonToLocalStorage = (key, data) => localStorage.setItem( key, JSON.stringify(data) );

    return {
        getJsonToLocalStorage,
        setJsonToLocalStorage
    }
}
