package com.zygomobile

import android.content.Context

/** Sets Mapbox SDK access token from Android string resources before any MapView is created. */
object MapboxTokenSetup {
  fun apply(context: Context) {
    val resId = context.resources.getIdentifier("mapbox_access_token", "string", context.packageName)
    if (resId == 0) return
    val token = context.getString(resId).trim()
    if (token.isEmpty()) return
    try {
      val options = Class.forName("com.mapbox.common.MapboxOptions")
      try {
        val setter = options.getMethod("setAccessToken", String::class.java)
        setter.invoke(null, token)
      } catch (_: NoSuchMethodException) {
        val field = options.getDeclaredField("accessToken")
        field.isAccessible = true
        field.set(null, token)
      }
    } catch (_: Throwable) {
      // JS setAccessToken runs in index.js before the app registers.
    }
  }
}
