/*!
* Copyright 2024-Present Animoca Brands Corporation Ltd. 
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { InternalError } from "../utils/errors";
import AsyncStorage from '@react-native-async-storage/async-storage';

class SavedObject
{
    storageProvider;
    storageName;

    constructor ( storageProvider, storageName )
    {
        this.storageProvider = storageProvider;
        this.storageName = storageName;
    }

    async getItem ( key )
    {
        const storage = await this.getStorage();
        return storage[ key ];
    }

    async setItem ( key, value )
    {
        return await this.updateStorage( key, value );
    }

    async removeItem ( key )
    {
        return await this.clearStorage( key );
    }

    async getStorage ()
    {
        let storageString = await this.storageProvider.getItem( this.storageName );
        storageString = storageString || '{}';
        try
        {
            return JSON.parse( storageString );
        } catch ( e )
        {
            throw new InternalError( 'Unable to parse storage string: ' + this.storageName );
        }
    }

    async setStorage ( obj )
    {
        try
        {
            let storageString = obj ? JSON.stringify( obj ) : '{}';
            await this.storageProvider.setItem( this.storageName, storageString );
        } catch ( e )
        {
            throw new Error( 'Unable to set storage: ' + this.storageName );
        }
    }

    async clearStorage ( key )
    {
        if ( !key )
        {
            // clear all
            await this.storageProvider.removeItem( this.storageName );
            return;
        }

        let obj = await this.getStorage();
        delete obj[ key ];
        await this.setStorage( obj );
    }

    async updateStorage ( key, value )
    {
        let obj = await this.getStorage();
        obj[ key ] = value;
        await this.setStorage( obj );
    }
}

export class BaseStorageManager
{
    storageProvider;
    storageName;
    constructor ( storageName, storageProvider )
    {
        this.storageName = storageName;
        this.storageProvider = storageProvider;
    }

    getStorageObject ()
    {
        return new SavedObject( this.storageProvider, this.storageName );
    }
}

export class AsyncStorageManager extends BaseStorageManager
{
    constructor ( storageName )
    {
        super( storageName, AsyncStorage );
    }
}

export const getStorageClass = (opts) => {
    return AsyncStorageManager;
}