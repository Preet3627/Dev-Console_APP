import { SiteData } from '../types';

let currentSiteData: SiteData | null = null;

export const initializeSiteData = (siteData: SiteData | null) => {
    currentSiteData = siteData;
};

export const getSiteData = (): SiteData | null => {
    return currentSiteData;
};
