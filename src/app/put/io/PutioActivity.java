package app.put.io;

import android.os.Bundle;
import android.util.Log;

import com.phonegap.DroidGap;

public class PutioActivity extends DroidGap {
	private static final String TAG = "MyActivity";
    /** Called when the activity is first created. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
    	Log.v(TAG, "xxx 1");
        super.onCreate(savedInstanceState);
        // setContentView(R.layout.main);
        super.loadUrl("file:///android_asset/www/index.html");
    }
}