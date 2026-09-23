package com.citex.dragonisland.android;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import com.citex.dragonisland.android.drawing.GLSurfaceView;
import com.citex.dragonisland.android.drawing.GLSurfaceViewRenderer;
import com.citex.dragonisland.android.event.GLSurfaceViewEvent;
import com.citex.dragonisland.core.game.GameMode;
import com.citex.dragonisland.core.game.Settings;

/**
 * MainActivity.java
 * This class is the main activity context.
 * Copyright (C) 2023 Lawrence Schmid
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

public class MainActivity extends Activity {
	
    /** Surface for displaying OpenGL rendering. */
	private GLSurfaceView mGLSurfaceView;
	
	/** Provides access to an application's raw asset files. */
    public static AssetManager mAssetManager;
    
    /** Interface to global information about an application environment. */
    public static Context mContext;
    
    /** Main activity. */
    public static Activity mActivity;	

    /** Graphics renderer. */
    public GLSurfaceViewRenderer mRenderer;

    /** Live scenario animation, drawn behind the transparent GL surface. */
    private static WebView mWebView;

    /** The scenario file currently loaded in mWebView, to avoid reloading it every frame. */
    private static String mCurrentScenario;

    /** World.Level (e.g. "1.3") to scenario file under assets/web/. */
    private static final Map<String, String> SCENARIOS = new HashMap<>();
    static {
    	SCENARIOS.put("0.0", "invasao.html");
    	SCENARIOS.put("1.1", "cidade.html");
    	SCENARIOS.put("1.2", "lua.html");
    	SCENARIOS.put("1.3", "foguete.html");
    	SCENARIOS.put("1.4", "meteoro.html");
    	SCENARIOS.put("1.5", "planeta.html");
    	SCENARIOS.put("1.6", "buraco-negro.html");
    	SCENARIOS.put("1.7", "estacao.html");
    	SCENARIOS.put("1.8", "cometas.html");
    }

    /**
     * Loads the scenario that matches a level path into the background WebView,
     * if it is not already loaded. Safe to call from any thread.
     * @param levelPath Level file path, e.g. "1.3.0.lvl".
     */
    public static void setScenario(String levelPath) {
    	if (mWebView == null || levelPath == null) {
    		return;
    	}
    	String[] parts = levelPath.split("\\.");
    	if (parts.length < 2) {
    		return;
    	}
    	String key = parts[0] + "." + parts[1];
    	String file = SCENARIOS.get(key);
    	if (file == null || file.equals(mCurrentScenario)) {
    		return;
    	}
    	mCurrentScenario = file;
    	final String url = "file:///android_asset/web/" + file;
    	mActivity.runOnUiThread(new Runnable() {
    		public void run() {
    			mWebView.loadUrl(url);
    		}
    	});
    }

    /**
     * Called when the activity is starting. 
     * @param savedInstanceState Contains saved instance state data.
     */
    @Override
    public void onCreate(Bundle savedInstanceState) { 

		super.onCreate(savedInstanceState);

        View decorView = getWindow().getDecorView();

        // Hide the status bar.
        int uiOptions = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
        decorView.setSystemUiVisibility(uiOptions);

    	// Restart activity on resume.
    	if(savedInstanceState != null) {    		
    		finish(); 
    		restart(mContext, 1);
    	}
    	
    	// Initialise settings.
    	Settings.Mode = GameMode.ANDROID;
    	Settings.InternalStorageFolder = Environment.getExternalStorageDirectory() + "/Android/data/com.citex.dragonisland/";
    	    	
		mContext = this;
		mActivity = this;
		mAssetManager = this.getAssets();
		mGLSurfaceView = new GLSurfaceViewEvent(this);

		if(Settings.WebBackground) {

			FrameLayout root = new FrameLayout(this);

			// Live scenario animation, underneath.
			mWebView = new WebView(this);
			WebSettings webSettings = mWebView.getSettings();
			webSettings.setJavaScriptEnabled(true);
			mWebView.setBackgroundColor(Color.TRANSPARENT);
			mCurrentScenario = "invasao.html";
			mWebView.loadUrl("file:///android_asset/web/" + mCurrentScenario);
			root.addView(mWebView, new FrameLayout.LayoutParams(
					FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

			// Game surface, transparent, on top.
			root.addView(mGLSurfaceView, new FrameLayout.LayoutParams(
					FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

			setContentView(root);

		} else {
			setContentView(mGLSurfaceView);
		}
    }

    /**
     * No-op: ads removed.
     */
    public void addAdvertisement() {
    }

    /**
     * No-op: ads removed.
     */
    public void removeAdvertisement() {
    }

    /**
     * Restarts the activity.
     * @param context Context object.
     * @param delay Delay before restarting.
     */
    public static void restart(Context context, int delay) {
        
    	// Set minimum delay.
    	if (delay == 0)
            delay = 1;
        
    	// Initialise the restart intent.
        Intent restartIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        
        // Schedule the intent to restart.
        PendingIntent intent = PendingIntent.getActivity(context, 0, restartIntent, PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_MUTABLE);
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        manager.set(AlarmManager.RTC, System.currentTimeMillis() + delay, intent);
        
        // Exit app.
        System.exit(2);
    }
    
    /**
     * Called when the activity has detected the user's press of the back key.
     */
    @Override
    public void onBackPressed() {
    	((GLSurfaceViewEvent)mGLSurfaceView).onBackPressed();
    }  
    
    /** Called when leaving the activity */
    @Override
    public void onPause() {

    	// Pause GL surface view.
    	if(mGLSurfaceView != null)
    		mGLSurfaceView.onPause();

    	// Pause the scenario animation.
    	if(mWebView != null)
    		mWebView.onPause();

    	// Save settings.
    	try {
			Settings.saveSettings(Settings.InternalStorageFolder + "settings.dat");
		} catch (IOException e) {
			e.printStackTrace();
		}

  		// Stop music.
    	((GLSurfaceViewEvent)mGLSurfaceView).getMain().getMusicPlayer().stop();
	
    	// Kill main thread.
    	((GLSurfaceViewEvent)mGLSurfaceView).getMain().kill();
    	
    	// Destroy all resources.
    	Settings.State = "destroy";	
		
		super.onPause();
		
	    System.exit(2);    
    }

    /** Called when returning to the activity */
    @Override
    public void onResume() {
        
    	super.onResume();

        // Resume GL surface view.
    	if(mGLSurfaceView != null)
    		mGLSurfaceView.onResume();

    	// Resume the scenario animation.
    	if(mWebView != null)
    		mWebView.onResume();

    }

    /** Called before the activity is destroyed */
    @Override
    public void onDestroy() {

    	// Destroy the scenario animation.
    	if(mWebView != null)
    		mWebView.destroy();

    	// Save settings.
    	try {
			Settings.saveSettings(Settings.InternalStorageFolder + "settings.dat");
		} catch (IOException e) {
			e.printStackTrace();
		}
    	
  		// Stop music.
    	((GLSurfaceViewEvent)mGLSurfaceView).getMain().getMusicPlayer().stop();
	
    	// Kill main thread.
    	((GLSurfaceViewEvent)mGLSurfaceView).getMain().kill();
    	
    	// Destroy all resources.
    	Settings.State = "destroy";	

        super.onDestroy();
        
        System.exit(2);
    }   

    /**
     * Gets the GLSurfaceView.
     * @return GLSurfaceView object.
     */
    public GLSurfaceViewEvent getSurface() {
    	return (GLSurfaceViewEvent)mGLSurfaceView;
    }

}