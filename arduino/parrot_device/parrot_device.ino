/*
  Parrot research device - Arduino Nano ESP32

  What this sketch does:
  - reads 4 physical push buttons
  - plays an assigned audio track through a DFPlayer Mini module
  - sends every press to the local web-app API as JSON

  Important:
  - The Arduino cannot reach http://localhost on your laptop.
    Set API_HOST to your laptop's LAN IP, e.g. 192.168.1.23.
  - Put audio files on the DFPlayer microSD as:
      /mp3/0001.mp3
      /mp3/0002.mp3
      /mp3/0003.mp3
      /mp3/0004.mp3
    The web app can still store the human-readable filenames.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <DFRobotDFPlayerMini.h>

// ---------- CHANGE THESE ----------
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_HOST = "192.168.1.23"; // your laptop IP, NOT localhost
const int API_PORT = 3001;
// ----------------------------------

const int BUTTON_PINS[4] = {2, 3, 4, 5};
const int TRACK_FOR_BUTTON[4] = {1, 2, 3, 4};

// Pick two free UART pins connected to DFPlayer Mini.
// Arduino TX -> DFPlayer RX through ~1k resistor
// Arduino RX -> DFPlayer TX
const int DFPLAYER_RX_PIN = 16;
const int DFPLAYER_TX_PIN = 17;

HardwareSerial dfSerial(1);
DFRobotDFPlayerMini player;

bool lastButtonState[4] = {HIGH, HIGH, HIGH, HIGH};
unsigned long lastPressMs[4] = {0, 0, 0, 0};
const unsigned long DEBOUNCE_MS = 250;

String apiUrl(const String& path) {
  return "http://" + String(API_HOST) + ":" + String(API_PORT) + path;
}

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected. Arduino IP: ");
  Serial.println(WiFi.localIP());
}

void sendPressLog(int buttonNumber, int trackNumber) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(apiUrl("/api/log"));
  http.addHeader("Content-Type", "application/json");

  String body = "{\"button\":" + String(buttonNumber) +
                ",\"soundfile\":\"track_" + String(trackNumber) + "\"}";

  int code = http.POST(body);
  Serial.print("POST /api/log status: ");
  Serial.println(code);
  http.end();
}

void handleButtonPress(int index) {
  int buttonNumber = index + 1;
  int trackNumber = TRACK_FOR_BUTTON[index];

  Serial.print("Button pressed: ");
  Serial.println(buttonNumber);

  player.play(trackNumber);
  sendPressLog(buttonNumber, trackNumber);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  for (int i = 0; i < 4; i++) {
    pinMode(BUTTON_PINS[i], INPUT_PULLUP);
  }

  connectWiFi();

  dfSerial.begin(9600, SERIAL_8N1, DFPLAYER_RX_PIN, DFPLAYER_TX_PIN);
  if (!player.begin(dfSerial)) {
    Serial.println("DFPlayer Mini not found. Check wiring and SD card.");
  } else {
    player.volume(20); // 0 to 30
    Serial.println("DFPlayer Mini ready.");
  }
}

void loop() {
  for (int i = 0; i < 4; i++) {
    bool currentState = digitalRead(BUTTON_PINS[i]);
    bool pressed = lastButtonState[i] == HIGH && currentState == LOW;
    bool debounceOk = millis() - lastPressMs[i] > DEBOUNCE_MS;

    if (pressed && debounceOk) {
      lastPressMs[i] = millis();
      handleButtonPress(i);
    }

    lastButtonState[i] = currentState;
  }
}
