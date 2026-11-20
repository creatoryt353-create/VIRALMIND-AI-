package com.viralmind.ai

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import java.io.File

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        setContentView(web)

        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (request.url.host == "appassets.androidplatform.net") return false
                try { startActivity(Intent(Intent.ACTION_VIEW, request.url)) } catch (_: Exception) {}
                return true
            }
        }
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.textZoom = 100
        web.addJavascriptInterface(Bridge(), "Android")
        web.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("(window.handleBack&&window.handleBack())===true") { r ->
                    if (r != "true") finish()
                }
            }
        })
    }

    inner class Bridge {
        @JavascriptInterface
        fun copy(text: String) {
            runOnUiThread {
                val cm = getSystemService(CLIPBOARD_SERVICE) as ClipboardManager
                cm.setPrimaryClip(ClipData.newPlainText("ViralMind AI", text))
            }
        }

        @JavascriptInterface
        fun share(text: String) {
            runOnUiThread {
                val i = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, text)
                }
                startActivity(Intent.createChooser(i, "Share"))
            }
        }

        @JavascriptInterface
        fun saveTxt(name: String, text: String): String {
            val safe = name.replace(Regex("[^A-Za-z0-9._-]"), "_")
            return try {
                if (Build.VERSION.SDK_INT >= 29) {
                    val v = ContentValues().apply {
                        put(MediaStore.Downloads.DISPLAY_NAME, safe)
                        put(MediaStore.Downloads.MIME_TYPE, "text/plain")
                        put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/ViralMind")
                    }
                    val uri: Uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v)
                        ?: return ""
                    contentResolver.openOutputStream(uri)?.use { it.write(text.toByteArray()) }
                    "Downloads/ViralMind/$safe"
                } else {
                    val dir = getExternalFilesDir(null) ?: filesDir
                    File(dir, safe).writeText(text)
                    File(dir, safe).absolutePath
                }
            } catch (e: Exception) { "" }
        }
    }
}
