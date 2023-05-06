import axios from 'axios';

const apiUrls = {
    pogoApi: import.meta.env.VITE_BASE_URL_POGOAPI_URL,
    pokeApi: import.meta.env.VITE_BASE_URL_POKEAPI_URL
}

export function useFetch() {

    const get = async(api, endpoint) => {
        try {
            const URL = `${apiUrls[api]}${endpoint}`;
            const response = await axios.get(URL);
            return response;
        } catch (error) {
            console.log(error);
            return error;
        }
    }

  return {
    get,
  }
}



