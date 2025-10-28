import React, { useState, useEffect, useCallback } from 'react';
import { SiteData, AssetType, Asset } from '../types';
import { listAssets, toggleAssetStatus, deleteAsset } from '../services/wordpressService';
import { PluginIcon, ThemeIcon, EditIcon } from './icons/Icons';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface AssetManagerProps {
    siteData: SiteData;
    assetType: AssetType;
    onEditAsset: (asset: Asset) => void;
}

const AssetManager: React.FC<AssetManagerProps> = ({ siteData, assetType, onEditAsset }) => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const assetTypeName = assetType.charAt(0).toUpperCase() + assetType.slice(1);
    const AssetIcon = assetType === AssetType.Plugin ? PluginIcon : ThemeIcon;

    const fetchAssets = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedAssets = await listAssets(siteData, assetType);
            setAssets(fetchedAssets);
        } catch (err) {
            setError(`Failed to load ${assetType}s. Please check your connection.`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [siteData, assetType]);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    const handleToggleStatus = async (asset: Asset) => {
        const originalStatus = asset.isActive;
        setAssets(prevAssets => prevAssets.map(a => a.identifier === asset.identifier ? { ...a, isActive: !a.isActive } : a));

        try {
            await toggleAssetStatus(siteData, asset.type, asset.identifier, !originalStatus);
        } catch (err) {
            setError(`Failed to update ${asset.name} status.`);
            setAssets(prevAssets => prevAssets.map(a => a.identifier === asset.identifier ? { ...a, isActive: originalStatus } : a));
        }
    };

    const handleDelete = async () => {
        if (!assetToDelete) return;
        setIsDeleting(true);
        try {
            await deleteAsset(siteData, assetToDelete.type, assetToDelete.identifier);
            setAssets(prevAssets => prevAssets.filter(a => a.identifier !== assetToDelete.identifier));
            setAssetToDelete(null);
        } catch (err) {
            setError(`Failed to delete ${assetToDelete.name}.`);
        } finally {
            setIsDeleting(false);
        }
    };

    const renderAssetList = () => {
        if (isLoading) {
            return <div className="text-center p-8">Loading {assetType}s...</div>;
        }
        if (error) {
            return <div className="text-center p-8 text-accent-red">{error}</div>;
        }
        if (assets.length === 0) {
            return <div className="text-center p-8">No {assetType}s found.</div>;
        }
        return (
            <div className="bg-background-secondary border border-border-primary rounded-lg overflow-hidden">
                <ul className="divide-y divide-border-primary">
                    {assets.map((asset, index) => (
                        <li 
                            key={asset.identifier} 
                            className="p-4 flex items-center justify-between hover:bg-background transition-colors animate-staggered-list-item"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="flex items-center">
                                <AssetIcon className="w-8 h-8 mr-4 text-text-secondary" />
                                <div>
                                    <p className="font-bold text-text-primary">{asset.name}</p>
                                    <p className="text-sm text-text-secondary">Version {asset.version}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <div className={`w-3 h-3 rounded-full ${asset.isActive ? 'bg-accent-green' : 'bg-text-secondary'}`}></div>
                                    <span className="text-sm">{asset.isActive ? 'Active' : 'Inactive'}</span>
                                </div>
                                <button
                                    onClick={() => handleToggleStatus(asset)}
                                    className={`px-3 py-1 text-sm rounded-md ${asset.isActive ? 'bg-accent-yellow/20 text-accent-yellow hover:bg-accent-yellow/30' : 'bg-accent-green/20 text-accent-green hover:bg-accent-green/30'}`}
                                >
                                    {asset.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                    onClick={() => onEditAsset(asset)}
                                    className="p-2 hover:bg-border-primary rounded-md"
                                    title="Edit Files"
                                >
                                    <EditIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setAssetToDelete(asset)}
                                    className="px-3 py-1 text-sm bg-accent-red/20 text-accent-red hover:bg-accent-red/30 rounded-md"
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <div>
            <h1 className="text-4xl font-bold mb-8">{assetTypeName} Management</h1>
            {renderAssetList()}
            {assetToDelete && (
                <DeleteConfirmationModal
                    assetName={assetToDelete.name}
                    assetType={assetType}
                    onConfirm={handleDelete}
                    onCancel={() => setAssetToDelete(null)}
                    isLoading={isDeleting}
                />
            )}
        </div>
    );
};

export default AssetManager;