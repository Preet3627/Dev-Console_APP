import { SiteData, AssetType } from '../types';
import * as wordpressService from './wordpressService';

/**
 * Executes a tool function based on the AI's request.
 * This acts as a router between the AI's desired action and the
 * actual service function that interacts with the WordPress site.
 */
export const executeTool = async (toolCall: { name: string; args: any }, siteData: SiteData): Promise<any> => {
    const { name, args } = toolCall;

    switch (name) {
        case 'listAssets':
            return wordpressService.listAssets(siteData, args.assetType as AssetType);
        case 'toggleAssetStatus':
            return wordpressService.toggleAssetStatus(siteData, args.assetType as AssetType, args.assetIdentifier, args.newStatus);
        case 'deleteAsset':
            return wordpressService.deleteAsset(siteData, args.assetType as AssetType, args.assetIdentifier);
        case 'installAsset':
            return wordpressService.installAsset(siteData, args.assetType as AssetType, args.assetName, args.files);
        case 'getAssetFiles':
            return wordpressService.getAssetFiles(siteData, args.assetIdentifier, args.assetType as AssetType);
        case 'readFileContent':
            return wordpressService.readFileContent(siteData, args.assetIdentifier, args.assetType as AssetType, args.relativePath);
        case 'writeFileContent':
            return wordpressService.writeFileContent(siteData, args.assetIdentifier, args.assetType as AssetType, args.relativePath, args.content);
        case 'getDbTables':
            return wordpressService.getDbTables(siteData);
        case 'executeSafeDbQuery':
            return wordpressService.executeSafeDbQuery(siteData, args.queryType, args.params);
        default:
            // If the tool is not found, throw an error.
            console.error(`Unknown tool called: ${name}`);
            throw new Error(`The tool "${name}" is not a known function.`);
    }
};
