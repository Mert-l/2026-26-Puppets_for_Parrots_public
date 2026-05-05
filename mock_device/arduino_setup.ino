// functionalities: 
//     - master switch (pin TBA), turns on/off the full system
//     - wifi switch (pin TBA), turns on/off wifi for server write/reads
//     - 4 buttons (pins TBA), play a sound upon pressed and write current time/sound played to datavase.csv
    
// file setup:
//     - sounds -> many .wav files
//         - contains every soundfile uploaded.
//     - metadata -> sound_index.json
//         - contains soundfile name, label (description) and duration, for each file in the sounds folder
//     - config -> button_map.json
//         - dictionary with 4 items and their respective sounds linked.
//     - log -> database.csv
//         - timestamp | button | soundfile played, written every time a butten gets pressed

#include <WiFi.h>
#include <SD.h>
#include <SPI.h>
#include <ArduinoJson.h>
#include "time.h"
#include "Audio.h"

// WIFI
const char* ssid = "WIFI_NAME";
const char* password = "WIFI_PASSWORD";
const int wifiPin = 4; // change to wifi pin
bool wifiActive = false;

// MASTER OFF SWITCH
const int masterSwitchPin = 16; // change to switch pin
bool systemEnabled = true;

// SD
#define SD_CS 5 // change to sd pin
File logFile;

// BUTTONS
const int buttons[4] = {12, 13, 14, 15}; // change to button pins
bool lastState[4] = {HIGH, HIGH, HIGH, HIGH};

// TIME
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 3600;
const int daylightOffset_sec = 3600;

// AUDIO
Audio audio;
String buttonMap[5];

// depending on speaker architecture!!!
#define I2S_DOUT 25
#define I2S_BCLK 27
#define I2S_LRC  26

// PLAYBACK LOCK
bool isPlaying = false;
unsigned long playEndTime = 0;

// SOUND METADATA
struct SoundMeta {
  String name;
  int duration;
};

SoundMeta soundMeta[20];
int soundCount = 0;

// WIFI
void startWiFi() {
  Serial.println("WiFi ON");

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
  Serial.println(WiFi.localIP());

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  wifiActive = true;
}

void stopWiFi() {
  Serial.println("WiFi OFF");
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  wifiActive = false;
}

// LOGGING
void logButton(int buttonID) {

  if (!systemEnabled) return; // MASTER SWITCH

  struct tm timeinfo;
  String timestamp;

  if (getLocalTime(&timeinfo)) {
    char buffer[25];
    strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);
    timestamp = String(buffer);
  } else {
    timestamp = String(millis());
  }

  String soundName = buttonMap[buttonID];
  if (soundName.length() == 0) soundName = "UNKNOWN";

  logFile = SD.open("/log/database.csv", FILE_APPEND);

  if (logFile) {
    logFile.print(timestamp);
    logFile.print(",");
    logFile.print(buttonID);
    logFile.print(",");
    logFile.println(soundName);
    logFile.close();

    Serial.println("LOG → " + timestamp + " | " + String(buttonID) + " | " + soundName);
  } else {
    Serial.println("CSV write failed");
  }
}

// LOAD BUTTON MAP
void loadButtonMap() {
  File file = SD.open("/config/button_map.json");

  if (!file) {
    Serial.println("button_map.json missing");
    return;
  }

  StaticJsonDocument<256> doc;
  deserializeJson(doc, file);
  file.close();

  buttonMap[1] = doc["1"].as<String>();
  buttonMap[2] = doc["2"].as<String>();
  buttonMap[3] = doc["3"].as<String>();
  buttonMap[4] = doc["4"].as<String>();

  Serial.println("Button map loaded");
}

// LOAD SOUND METADATA
void loadSoundMetadata() {
  File file = SD.open("/metadata/sound_index.json");

  if (!file) {
    Serial.println("sound_index.json missing");
    return;
  }

  StaticJsonDocument<1024> doc;
  deserializeJson(doc, file);
  file.close();

  soundCount = 0;

  for (JsonObject s : doc["sounds"].as<JsonArray>()) {
    soundMeta[soundCount].name = s["name"].as<String>();
    soundMeta[soundCount].duration = s["duration_ms"];
    soundCount++;
  }

  Serial.println("Sound metadata loaded");
}

// GET DURATION
int getSoundDuration(String file) {
  for (int i = 0; i < soundCount; i++) {
    if (soundMeta[i].name == file) {
      return soundMeta[i].duration;
    }
  }
  return 1000;
}

// AUDIO INIT
void initAudio() {
  audio.setPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
  audio.setVolume(12);
}

// PLAY SOUND (LOCKED)
void playSound(String fileName) {

  if (!systemEnabled) return; // MASTER SWITCH

  if (isPlaying) {
    Serial.println("Blocked (audio busy)");
    return;
  }

  String path = "/sounds/" + fileName;
  Serial.println("Playing: " + path);

  audio.connecttoFS(SD, path.c_str());

  int duration = getSoundDuration(fileName);

  isPlaying = true;
  playEndTime = millis() + duration;
}

// SETUP
void setup() {
  Serial.begin(115200);

  // MASTER SWITCH
  pinMode(masterSwitchPin, INPUT_PULLUP);

  pinMode(wifiPin, INPUT_PULLUP);
  WiFi.mode(WIFI_OFF);

  for (int i = 0; i < 4; i++) {
    pinMode(buttons[i], INPUT_PULLUP);
  }

  if (!SD.begin(SD_CS)) {
    Serial.println("SD failed");
    return;
  }

  Serial.println("SD ready");

  SD.mkdir("/log");

  loadButtonMap();
  loadSoundMetadata();
  initAudio();
}

// LOOP
void loop() {

  audio.loop();

  // MASTER SWITCH
  systemEnabled = (digitalRead(masterSwitchPin) == LOW);

  if (!systemEnabled) {

    // hard stop everything
    if (wifiActive) stopWiFi();

    isPlaying = false;

    delay(50);
    return;
  }

  // unlock system after playback
  if (isPlaying && millis() > playEndTime) {
    isPlaying = false;
    Serial.println("Audio finished → unlocked");
  }

  // WiFi switch
  bool switchState = digitalRead(wifiPin);

  if (switchState == LOW && !wifiActive) startWiFi();
  if (switchState == HIGH && wifiActive) stopWiFi();

  // Buttons
  for (int i = 0; i < 4; i++) {

    bool currentState = digitalRead(buttons[i]);

    if (!isPlaying && lastState[i] == HIGH && currentState == LOW) {
      delay(30);

      if (digitalRead(buttons[i]) == LOW) {

        int buttonID = i + 1;

        logButton(buttonID);

        String sound = buttonMap[buttonID];

        if (sound.length() > 0) {
          playSound(sound);
        } else {
          Serial.println("No mapping");
        }
      }
    }

    lastState[i] = currentState;
  }

  delay(10);
}