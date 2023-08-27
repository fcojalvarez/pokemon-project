
export function useLocalStorage() {

    const getJsonToLocalStorage = async(key) => {
        await null;
        return JSON.parse( localStorage.getItem(key))
    };

    const getObjectValuesFromLocalStorage = async(key) => {
        const payload = await getJsonToLocalStorage(key);
        return Object.values(payload);
    }

    const setJsonToLocalStorage = async(key, data) => {
        await null;
        return localStorage.setItem( key, JSON.stringify(data) )
    };

    return {
        getObjectValuesFromLocalStorage,
        getJsonToLocalStorage,
        setJsonToLocalStorage
    }
}
