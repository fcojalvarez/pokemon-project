import axios from 'axios';
import { status200 } from '../utils/Settings';
import { useLocalStorage } from './localStorage';

const { setJsonToLocalStorage } = useLocalStorage();

const pogoApi = import.meta.env.VITE_BASE_URL_POGOAPI_URL;
const pokeApi = import.meta.env.VITE_BASE_URL_POKEAPI_URL;

export function useFetch() {

    const getPogoApi = async(endpoint) => {
        try {
            const URL = `${pogoApi}${endpoint}`;
            const response = await axios.get(URL);
            const { status, data } = response;

            if(status === status200) {
                const fileName = endpoint.match(/\/([^/]+)\./)[1];
                if(!endpoint.includes('hashes')) setJsonToLocalStorage(fileName , data);
            }
            return response
        } catch (error) {
            console.log(error);
        }
    }

    const getPokeApi = async(endpoint) => {
        try {
            const URL = `${pokeApi}${endpoint}`;
            const response = await axios.get(URL);
            return response;
        } catch (error) {
            console.log(error);
            return error;
        }
    }

  return {
    getPogoApi,
    getPokeApi
  }
}
