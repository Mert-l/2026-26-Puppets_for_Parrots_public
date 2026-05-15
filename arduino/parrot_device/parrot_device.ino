// install esp32 2.0.17!!! by espressif systems
// Libraries needed:
// WiFiManager by tzapu
// TimeLib by Michael Margolis

#include <Arduino.h>
#include <SPI.h>
#include <SD.h>
#include <FS.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <time.h>
#include <TimeLib.h>

// ---------- CHANGE THIS FOR YOUR NETWORK ----------
const char* API_HOST = "192.168.1.12";
const int API_PORT = 3001;
// --------------------------------------------------

// Pin Configs
const int chipSelect = D10;
const int audioPin = D9;
const int switchPins[] = {D3, D4, D5, D7};
const int numSwitches = 4;

const int WIFI_SWITCH_PIN = D2;

int lastStates[numSwitches];
int baselineStates[numSwitches];

// ---- Audio Internal Settings ----
const int pwmChannel = 0;
const int pwmFreq = 20000;
const int pwmResolution = 8;

#define BUFFER_SIZE 1024
uint8_t buffer[BUFFER_SIZE];

File audioFile;
bool isPlaying = false;

// ---- Logging & Queueing Variables ----
const char* QUEUE_FILE = "/queue.csv";
unsigned long lastSoundMs = 0;

struct PressLog {
  int button;
  String soundFile;
  String timestamp;
  unsigned long msSinceLastSound;
};

const int MAX_QUEUE = 500;
PressLog logQueue[MAX_QUEUE];
int queueCount = 0;

WiFiManager wm;

// ---- Sync Variables ----
unsigned long lastSyncMs = 0;
const unsigned long SYNC_INTERVAL_MS = 10000;

// ---------- helper configurations ----------

String apiUrl(const String& path) {
  return "http://" + String(API_HOST) + ":" + String(API_PORT) + path;
}

bool wifiSwitchEnabled() {
  return digitalRead(WIFI_SWITCH_PIN) == LOW;
}

String getTimestamp() {
  char buf[30];

  sprintf(
    buf,
    "%04d-%02d-%02dT%02d:%02d:%02dZ",
    year(),
    month(),
    day(),
    hour(),
    minute(),
    second()
  );

  return String(buf);
}

void syncClock() {

  Serial.println("Syncing time via NTP...");

  configTime(0, 0, "pool.ntp.org");

  time_t nowTime = time(nullptr);

  int retry = 0;

  while (nowTime < 100000 && retry < 15) {
    delay(500);
    nowTime = time(nullptr);
    retry++;
  }

  setTime(nowTime);

  Serial.print("Current synchronized time: ");
  Serial.println(getTimestamp());
}

void connectWiFi() {

  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println();
  Serial.println("========== WIFI START ==========");

  WiFi.mode(WIFI_STA);

  // optional but helps stability
  WiFi.setSleep(false);

  wm.setConfigPortalTimeout(0); // NEVER timeout

  // Try saved credentials first
  bool connected = wm.autoConnect("Parrot-device-Setup");

  // If failed, force portal mode
  if (!connected) {

    Serial.println("Failed to connect.");
    Serial.println("Starting config portal...");

    WiFi.disconnect(true);
    delay(1000);

    bool result = wm.startConfigPortal("Parrot-device-Setup");

    if (!result) {

      Serial.println("Portal failed.");
      delay(3000);

      ESP.restart();
    }
  }

  Serial.println("WiFi connected!");

  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  syncClock();
}

// ---------- DIRECTORY SETUP ----------

void ensureDirectories() {

  if (!SD.exists("/config")) {
    SD.mkdir("/config");
  }

  if (!SD.exists("/sounds")) {
    SD.mkdir("/sounds");
  }
}

// ---------- DOWNLOAD HELPERS ----------

bool downloadFile(String url, String localPath) {
  HTTPClient http;
  http.begin(url);
  http.addHeader("Connection", "close");
  int code = http.GET();

  if (code != HTTP_CODE_OK) {
    Serial.printf("Download failed, error: %d\n", code);
    http.end();
    return false; // Return false so we don't overwrite local files
  }

  int totalSize = http.getSize();
  WiFiClient * stream = http.getStreamPtr();
  File file = SD.open(localPath, FILE_WRITE);
  
  if (!file) {
    http.end();
    return false;
  }

  int downloaded = 0;
  uint8_t buf[512];
  while (downloaded < totalSize && (http.connected() || stream->available())) {
    size_t size = stream->available();
    if (size) {
      int c = stream->readBytes(buf, min(size, sizeof(buf)));
      file.write(buf, c);
      downloaded += c;
    }
  }
  file.close();
  http.end();
  return (downloaded == totalSize); // Only return true if we got everything
}

bool replaceFileFromServer(
  String remoteUrl,
  String localPath
) {

  // CONFIG FILES:
  // use safe .tmp replacement

  if (
    localPath.startsWith("/config/")
  ) {

    String tempPath =
      localPath + ".tmp";

    // remove old temp
    if (SD.exists(tempPath)) {
      SD.remove(tempPath);
    }

    bool ok =
      downloadFile(
        remoteUrl,
        tempPath
      );

    if (!ok) {
      return false;
    }

    // remove old config
    if (SD.exists(localPath)) {
      SD.remove(localPath);
    }

    // rename temp -> final
    if (
      !SD.rename(
        tempPath,
        localPath
      )
    ) {

      Serial.println(
        "Config rename failed"
      );

      return false;
    }

    return true;
  }

  // SOUND FILES:
  // direct download only

  else {

    if (SD.exists(localPath)) {
      SD.remove(localPath);
    }

    return downloadFile(
      remoteUrl,
      localPath
    );
  }
}

// ---------- CONFIG SYNC ----------

void syncConfig() {
  String url = apiUrl("/api/config/button_map.json");
  String localPath = "/config/button_map.json";

  if (replaceFileFromServer(url, localPath)) {
    Serial.println("Config synced safely");
  } else {
    Serial.println("Config sync failed - keeping old config");
  }
}

// ---------- SOUND SYNC ----------

void syncSounds() {

  HTTPClient http;

  String url = apiUrl("/api/sounds");

  http.begin(url);

  int code = http.GET();

  if (code != HTTP_CODE_OK) {
    Serial.println("Failed to fetch sound index");
    http.end();
    return;
  }

  String payload = http.getString();

  http.end();

  int pos = 0;

  while (true) {

    int nameKey =
      payload.indexOf("\"name\"", pos);

    if (nameKey == -1) {
      break;
    }

    int firstQuote =
      payload.indexOf("\"", nameKey + 7);

    int secondQuote =
      payload.indexOf("\"", firstQuote + 1);

    String fileName =
      payload.substring(
        firstQuote + 1,
        secondQuote
      );

    String localPath =
      "/sounds/" + fileName;

    if (!SD.exists(localPath)) {

      Serial.print("Downloading: ");
      Serial.println(fileName);

      String soundUrl =
        apiUrl("/api/sounds/" + fileName);

      replaceFileFromServer(
        soundUrl,
        localPath
      );
    }

    pos = secondQuote;
  }

  Serial.println("Sound sync complete");
}

// ---------- FULL SYNC ----------

void syncServerFiles() {

  if (!wifiSwitchEnabled()) {
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  ensureDirectories();

  syncConfig();

  syncSounds();
}

// ---------- PWM GENERATION ----------

void setupPWM() {
  ledcSetup(
    pwmChannel,
    pwmFreq,
    pwmResolution
  );

  ledcAttachPin(audioPin, pwmChannel);
}

// ---------- JSON LOOKUP ----------

String getMappedFile(int buttonNumber) {

  File file =
    SD.open("/config/button_map.json");

  if (!file) return "";

  String json = file.readString();

  file.close();

  String key =
    "\"" + String(buttonNumber) + "\":";

  int pos = json.indexOf(key);

  if (pos == -1) return "";

  int start =
    json.indexOf("\"", pos + key.length());

  int end =
    json.indexOf("\"", start + 1);

  if (start == -1 || end == -1) return "";

  return json.substring(start + 1, end);
}

// ---------- LOGGING ----------

void queuePressLog(
  int buttonNumber,
  String fileName
) {

  if (queueCount >= MAX_QUEUE) {
    return;
  }

  unsigned long nowMs = millis();

  unsigned long delta =
    lastSoundMs == 0
      ? 0
      : nowMs - lastSoundMs;

  lastSoundMs = nowMs;

  String ts = getTimestamp();

  File file = SD.open(
    QUEUE_FILE,
    FILE_APPEND
  );

  if (file) {

    file.print(buttonNumber);
    file.print(",");

    file.print(fileName);
    file.print(",");

    file.print(ts);
    file.print(",");

    file.println(delta);

    file.close();
  }

  logQueue[queueCount].button = buttonNumber;
  logQueue[queueCount].soundFile = fileName;
  logQueue[queueCount].timestamp = ts;
  logQueue[queueCount].msSinceLastSound = delta;

  queueCount++;
}

// ---------- QUEUE UPLOAD ----------

void flushQueue() {

  if (!wifiSwitchEnabled()) {
    return;
  }

  if (queueCount == 0) {
    return;
  }

  connectWiFi();

  syncClock();

  for (int i = 0; i < queueCount; i++) {

    if (WiFi.status() != WL_CONNECTED) {
      break;
    }

    HTTPClient http;

    http.setReuse(false);
    http.setTimeout(50000);

    String url = apiUrl("/api/log");

    http.begin(url);

    http.addHeader(
      "Content-Type",
      "application/json"
    );

    String body =
      "{"
      "\"button\":" +
      String(logQueue[i].button) +
      "," +

      "\"soundfile\":\"" +
      logQueue[i].soundFile +
      "\"," +

      "\"timestamp\":\"" +
      logQueue[i].timestamp +
      "\"," +

      "\"ms_since_last_sound\":" +
      String(logQueue[i].msSinceLastSound) +
      "}";

    int httpCode = http.POST(body);

    Serial.print("POST status: ");
    Serial.println(httpCode);

    http.end();

    delay(1000);
  }

  queueCount = 0;

  if (SD.exists(QUEUE_FILE)) {
    SD.remove(QUEUE_FILE);
  }
}

// ---------- AUDIO ----------

void startAudio(String fileName) {

  if (isPlaying) return;

  String path =
    "/sounds/" + fileName;

  audioFile = SD.open(path);

  if (!audioFile) {
    Serial.println("Missing audio");
    return;
  }

  audioFile.seek(44);

  isPlaying = true;

  Serial.println(path);
}

void updateAudio() {
  // Rule 1: If WiFi is enabled, kill audio immediately and exit
  if (wifiSwitchEnabled()) {
    if (isPlaying) {
      if (audioFile) audioFile.close();
      isPlaying = false;
      Serial.println("Audio aborted for WiFi sync");
    }
    return;
  }

  // Rule 2: If we aren't playing, do nothing
  if (!isPlaying || !audioFile) {
    return;
  }

  // Rule 3: Handle the end of the file normally
  if (audioFile.available() < BUFFER_SIZE) {
    audioFile.close();
    isPlaying = false;
    for (int i = 0; i < numSwitches; i++) {
      baselineStates[i] = digitalRead(switchPins[i]);
    }
    return;
  }

  // Rule 4: Only if rules 1-3 pass, read and play the audio
  int bytesRead = audioFile.read(buffer, BUFFER_SIZE);
  for (int i = 0; i < bytesRead; i += 2) {
    int16_t sample = buffer[i] | (buffer[i + 1] << 8);
    uint8_t pwmValue = (sample >> 8) + 128;
    ledcWrite(pwmChannel, pwmValue);
    delayMicroseconds(20);
  }
}
// ---------- INPUT ----------

void checkSwitches() {

  if (wifiSwitchEnabled()) return;

  if (isPlaying) return;

  for (int i = 0; i < numSwitches; i++) {

    int state =
      digitalRead(switchPins[i]);

    if (state != lastStates[i]) {

      lastStates[i] = state;

      if (state != baselineStates[i]) {

        int buttonNumber = i + 1;

        String fileName =
          getMappedFile(buttonNumber);

        Serial.print("Button ");
        Serial.print(buttonNumber);
        Serial.print(" -> ");
        Serial.println(fileName);

        queuePressLog(
          buttonNumber,
          fileName
        );

        startAudio(fileName);

        return;
      }
    }
  }
}

// ---------- SETUP ----------

void setup() {

  Serial.begin(115200);

  delay(1000);

  for (int i = 0; i < numSwitches; i++) {

    pinMode(
      switchPins[i],
      INPUT_PULLUP
    );

    lastStates[i] =
      digitalRead(switchPins[i]);

    baselineStates[i] =
      lastStates[i];
  }

  pinMode(
    WIFI_SWITCH_PIN,
    INPUT_PULLUP
  );

  SPI.begin(
    D13,
    D12,
    D11,
    chipSelect
  );

  if (!SD.begin(chipSelect)) {

    Serial.println("SD failed");

    while (1);
  }

  ensureDirectories();

  setupPWM();

  if (wifiSwitchEnabled()) {

    connectWiFi();

    syncClock();

    syncServerFiles();

    lastSyncMs = millis();
  }

  Serial.println("Ready");
}

// ---------- LOOP ----------

void loop() {

  updateAudio();

  checkSwitches();

  static bool wifiWasEnabled = false;

  bool wifiCurrentlyEnabled =
    wifiSwitchEnabled();

  if (wifiCurrentlyEnabled) {

    if (!wifiWasEnabled) {

      connectWiFi();

      syncClock();

      flushQueue();

      syncServerFiles();

      lastSyncMs = millis();
    }

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Reconnecting WiFi");

      connectWiFi();
    }

    if (
      millis() - lastSyncMs >
      SYNC_INTERVAL_MS
    ) {

      syncServerFiles();

      flushQueue();

      lastSyncMs = millis();
    }

  } else {

    if (wifiWasEnabled) {

      Serial.println("WiFi OFF");

      WiFi.disconnect(true);

      WiFi.mode(WIFI_OFF);
    }
  }

  wifiWasEnabled =
    wifiCurrentlyEnabled;

  delay(1);
}