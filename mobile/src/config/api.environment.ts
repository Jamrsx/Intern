import { LOCAL_API_CONFIG } from './api.local';
import { PRODUCTION_API_CONFIG } from './api.production';

export type ApiEnvironment = 'local' | 'production';

let currentEnvironment: ApiEnvironment = __DEV__ ? 'local' : 'production';

export function getApiEnvironment(): ApiEnvironment {
    return currentEnvironment;
}

export function setApiEnvironment(environment: ApiEnvironment): void {
    currentEnvironment = environment;
    console.log('API environment switched', {
        environment,
        baseUrl: getApiBaseUrl(),
    });
}

export function getApiBaseUrl(): string {
    return currentEnvironment === 'local'
        ? LOCAL_API_CONFIG.baseUrl
        : PRODUCTION_API_CONFIG.baseUrl;
}

export function getApiEnvironmentLabel(): string {
    return currentEnvironment === 'local'
        ? LOCAL_API_CONFIG.label
        : PRODUCTION_API_CONFIG.label;
}

export function getWebLoginUrl(): string {
    return `${getApiBaseUrl()}/login`;
}
