import json
import sys
import os
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from keras.models import Sequential
from keras.layers import LSTM, Dense, Input
import io

# Force stdout and stderr to use UTF-8 encoding
sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8')

# Environmental settings for TensorFlow
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"  # Disable GPU
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TensorFlow info and warnings

# Read and parse the input JSON from stdin
ohlc_json = sys.stdin.read()
ohlc_data = json.loads(ohlc_json)

# Prepare data
ohlc = [[data[1], data[2], data[3], data[4]] for data in ohlc_data]
ohlc_array = np.array(ohlc)
ohlc_avg = np.mean(ohlc_array, axis=1).reshape(-1, 1)

# Normalize the data
scaler = MinMaxScaler(feature_range=(0, 1))
scaled_data = scaler.fit_transform(ohlc_avg)

# Time step configuration
time_step = 100

# Function to create dataset with time steps
def create_dataset(dataset, time_step=1):
    X, y = [], []
    for i in range(len(dataset)-time_step-1):
        a = dataset[i:(i+time_step), 0]
        X.append(a)
        y.append(dataset[i + time_step, 0])
    return np.array(X), np.array(y)

# Generate training data
X_train, y_train = create_dataset(scaled_data, time_step)
X_train = X_train.reshape(X_train.shape[0], X_train.shape[1], 1)

# Define the LSTM model with an explicit input layer
model = Sequential()
model.add(Input(shape=(time_step, 1)))
model.add(LSTM(50, return_sequences=True))
model.add(LSTM(50))
model.add(Dense(1))
model.compile(optimizer='adam', loss='mean_squared_error')

# Train the model without console logs
model.fit(X_train, y_train, epochs=10, batch_size=64, verbose=0)

# Predict the next 7 days
inputs = scaled_data[-time_step:].reshape(1, -1, 1)
next_week_predictions = []
for i in range(7):
    next_price = model.predict(inputs)[0][0]
    rounded_next_price = round(next_price, 2)
    next_week_predictions.append([rounded_next_price])  # Store predictions
    inputs = np.append(inputs[:, 1:, :], [[[next_price]]], axis=1)  # Update input with new prediction

# Inverse transform to original scale
next_week_predictions = scaler.inverse_transform(next_week_predictions)
predicted_json = json.dumps(next_week_predictions.tolist())

# Output predictions as JSON
sys.stdout.write(predicted_json)
