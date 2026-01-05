package com.planflow.app;

import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

@CapacitorPlugin(name = "CalendarPlugin")
public class CalendarPlugin extends Plugin {

    @PluginMethod()
    public void openICSFile(PluginCall call) {
        String content = call.getString("content");
        String fileName = call.getString("fileName", "calendar.ics");

        if (content == null || content.isEmpty()) {
            call.reject("ICS content is required");
            return;
        }

        try {
            // 1. 保存 ICS 文件到缓存目录
            File cacheDir = getContext().getCacheDir();
            File icsFile = new File(cacheDir, fileName);
            
            FileOutputStream fos = new FileOutputStream(icsFile);
            fos.write(content.getBytes("UTF-8"));
            fos.close();

            // 2. 使用 FileProvider 获取 content:// URI
            Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                icsFile
            );

            // 3. 创建 ACTION_VIEW Intent
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(contentUri, "text/calendar");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            // 4. 启动 Intent
            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (IOException e) {
            call.reject("Failed to save ICS file: " + e.getMessage());
        } catch (Exception e) {
            call.reject("Failed to open calendar: " + e.getMessage());
        }
    }
}
