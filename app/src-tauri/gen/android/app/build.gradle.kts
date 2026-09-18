import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

// 版本直接取自 src-tauri/Cargo.toml，保证单一来源。
// 不读 tauri.properties：那个文件只在 `tauri android init` 时生成一次，
// 之后 `tauri android build` 不会更新它，版本号会悄悄和 Cargo.toml 脱钩。
val cargoVersion: String = file("../../../Cargo.toml").readLines()
    .first { it.trimStart().startsWith("version") }
    .substringAfter('"')
    .substringBefore('"')
val cargoVersionParts: List<Int> = cargoVersion.split(".").map { it.toInt() }

android {
    compileSdk = 36
    namespace = "com.wego.lolmswitch"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "com.wego.lolmswitch"
        minSdk = 24
        targetSdk = 36
        // 与 Tauri 的换算规则一致：major*1000000 + minor*1000 + patch
        versionCode =
            cargoVersionParts[0] * 1000000 + cargoVersionParts[1] * 1000 + cargoVersionParts[2]
        versionName = cargoVersion
    }
    signingConfigs {
        create("release") {
            val kp = rootProject.file("keystore.properties")
            if (kp.exists()) {
                val props = Properties().apply { kp.inputStream().use { load(it) } }
                storeFile = file(props.getProperty("storeFile"))
                storePassword = props.getProperty("storePassword")
                keyAlias = props.getProperty("keyAlias")
                keyPassword = props.getProperty("keyPassword")
            }
        }
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-process:2.10.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = "tauri.build.gradle.kts")