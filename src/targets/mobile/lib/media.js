/* global cozy FileUploadOptions FileTransfer */
import { isCordova, isAndroid } from './device'
import { _polyglot, initTranslation } from 'cozy-ui/react/I18n/translation'
import { getLang } from './init'
import { logException } from './reporter'

const hasCordovaPlugin = () => {
  return isCordova() &&
    window.cordova.plugins !== undefined &&
    window.cordova.plugins.listLibraryItems !== undefined
}

export const isAuthorized = async () => {
  if (!hasCordovaPlugin()) {
    return Promise.resolve(false)
  }
  return new Promise(resolve => {
    const success = () => resolve(true)
    const error = () => resolve(false)
    // window.cordova.plugins.photoLibrary.getLibrary(success, error, {includeCloudData: false, includeVideos: true})
    window.cordova.plugins.listLibraryItems.isAuthorized(success, error)
  })
}

export const requestAuthorization = async () => {
  if (!hasCordovaPlugin()) {
    return Promise.resolve(false)
  }
  return new Promise((resolve, reject) => {
    window.cordova.plugins.listLibraryItems.requestReadAuthorization(
      () => resolve(true),
      (error) => {
        if (!error.startsWith('Permission')) {
          console.warn(error)
          logException('requestAuthorization error:', error)
        }
        resolve(false)
      }
    )
  })
}

// export const getBlob = async (libraryItem) => {
//   if (hasCordovaPlugin()) {
//     return new Promise((resolve, reject) => {
//       window.cordova.plugins.photoLibrary.getLibraryItem(
//         libraryItem,
//         fullPhotoBlob => resolve(fullPhotoBlob),
//         err => reject(err)
//       )
//     })
//   }

//   return Promise.resolve('')
// }

// -------------------------------------------------------------------------
// LIBRARY ITEM UPLOAD (NSURLSESSION)
function onUploadSuccess (r) {
  console.log('Code = ' + r.responseCode)
  console.log('Response = ' + r.response)
  console.log('Sent = ' + r.bytesSent)
}

function onUploadFail (error) {
  alert('An error has occurred: Code = ' + error.code)
  console.log('upload error source ' + error.source)
  console.log('upload error target ' + error.target)
}
export const uploadLibraryItem = async (dirID, libraryItem) => {
  if (hasCordovaPlugin()) {
    return new Promise(async (resolve, reject) => {
      console.log(libraryItem)
      var credentials = await cozy.client.authorize()
      var token = credentials.token.accessToken
      var uri = encodeURI(cozy.client._url + '/files/' + dirID +
                          '?Type=file&Name=' + libraryItem['fileName'] +
                          '&Tags=library' +
                          '&Executable=false')
      console.log(uri)
      var payload = {
        'id': dirID,
        'libraryId': libraryItem['id'],
        'mimeType': libraryItem['mimeType'],
        'filePath': libraryItem['filePath'],
        'serverUrl': uri,
        'headers': {
          'Authorization': 'Bearer ' + token,
          'Content-Type': libraryItem['mimeType']
        }
      }
      console.log(payload)
      window.cordova.plugins.listLibraryItems.uploadItem(payload, onUploadSuccess, onUploadFail)
    })
  }
  return Promise.resolve('')
}
// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
// LIBRARY ITEM UPLOAD
export const uploadLibraryItemOLD = async (dirID, libraryItem) => {
  if (hasCordovaPlugin()) {
    return new Promise(async (resolve, reject) => {
      // Upload a file
      // POST /files/:dir-id
      // Type  file
      // Name  the file name
      // Tags  an array of tags
      // Executable  true if the file is executable (UNIX permission)
      var uri = encodeURI(cozy.client._url + '/files/' + dirID +
                          '?Type=file&Name=' + libraryItem['fileName'] +
                          '&Tags=library' +
                          '&Executable=false')
      var options = new FileUploadOptions()
      console.log(cozy.client)
      console.log(libraryItem)

      var credentials = await cozy.client.authorize()
      var token = credentials.token.accessToken
      options.fileKey = 'libraryItem:' + libraryItem['id'] // needed on iOS, to request PHAsset from ID (library items are sandboxed)
      options.fileName = libraryItem['fileName']
      options.mimeType = libraryItem['mimeType']
      options.headers = {
        'Authorization': 'Bearer ' + token,
        'Content-Type': libraryItem['mimeType']
      } // get that in plugin code
      console.log(options)
      var ft = new FileTransfer()
      ft.onprogress = function (progressEvent) {
        if (progressEvent.lengthComputable) {
          console.log('percent' + (progressEvent.loaded / progressEvent.total))
        } else {
          console.log('increment')
        }
      }
      ft.upload(libraryItem['fileName'], uri, (r) => {
        onUploadSuccess(r)
        resolve(r)
      }, (error) => {
        onUploadFail(error)
        reject(error)
      }, options)
    })
  }

  return Promise.resolve('')
}
// -------------------------------------------------------------------------

export const getPhotos = async () => {
  const defaultReturn = []

  if (hasCordovaPlugin()) {
    return new Promise((resolve, reject) => {
      window.cordova.plugins.listLibraryItems.listItems(
        true, true, false,
        (response) => resolve(response.library),
        (err) => {
          console.warn(err)
          resolve(defaultReturn)
        }
      )
    })
  }

  return Promise.resolve(defaultReturn)
}

export const getFilteredPhotos = async () => {
  let photos = await getPhotos()

  if (hasCordovaPlugin() && isAndroid()) {
    // TODO: filter in native code !!
    // photos = photos.filter((photo) => photo.id.indexOf('DCIM') !== -1)
  }

  return Promise.resolve(photos)
}

export const getMediaFolderName = () => {
  if (_polyglot === undefined) {
    const lang = getLang()
    const dictRequire = (lang) => require(`../../../locales/${lang}`)
    initTranslation(lang, dictRequire)
  }
  const dir = _polyglot.t('mobile.settings.media_backup.media_folder')

  return dir
}
