/* global cozy */
import { configure as configureReporter } from './reporter'
import { initClient, initBar, isClientRegistered } from './cozy-helper'
import { revokeClient } from '../actions/authorization'
import { startReplication } from '../actions/settings'

export const getLang = () => (navigator && navigator.language) ? navigator.language.slice(0, 2) : 'en'

export const initServices = async (store) => {
  configureReporter(store.getState().mobile.settings.analytics)
  if (store.getState().settings.client) {
    initClient(store.getState().mobile.settings.serverUrl)
  }

  const client = store.getState().settings.client
  if (client) {
    isClientRegistered(client)
      .then((clientIsRegistered) => {
        if (clientIsRegistered) {
          startReplication(store.dispatch, store.getState) // don't like to pass `store.dispatch` and `store.getState` as parameters, big coupling
          initBar()
        } else {
          console.warn('Your device is no more connected to your server')
          store.dispatch(revokeClient())
        }
      })
  }

  // retrieve url + token and send to native for keychain storage
  var credentials = await cozy.client.authorize()
  var token = credentials.token.accessToken
  var url = encodeURI(cozy.client._url)

  const success = (result) => {
    console.log('authStorage success')
  }
  const error = (error) => {
    console.log('authStorage error' + error)
  }
  window.cordova.plugins.authStorage.storeData(url, token, success, error)
}
