import json
import sys
import os 
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from keras.models import Sequential
from keras.layers import LSTM, Dense

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
# Read the JSON data from stdin
ohlc_json = sys.stdin.read()

# Parse the JSON data
ohlc_data = json.loads(ohlc_json)

# Extracting OHLC values
ohlc = [[data[1], data[2], data[3], data[4]] for data in ohlc_data]

# Convert the data to numpy array
ohlc_array = np.array(ohlc)

# Calculate the average OHLC value
ohlc_avg = np.mean(ohlc_array, axis=1).reshape(-1, 1)

# Normalize the dataset
scaler = MinMaxScaler(feature_range=(0, 1))
scaled_data = scaler.fit_transform(ohlc_avg)

# Define the time step
time_step = 100

# Creating a dataset with a time step
def create_dataset(dataset, time_step=1):
    X, y = [], []
    for i in range(len(dataset)-time_step-1):
        X.append(dataset[i:(i+time_step)])
        y.append(dataset[i + time_step])
    return np.array(X), np.array(y)

# Prepare the dataset
X_train, y_train = create_dataset(scaled_data, time_step)

# Reshape input to be [samples, time steps, features] which is required for LSTM
X_train = X_train.reshape(X_train.shape[0], X_train.shape[1], X_train.shape[2])

# Create LSTM Model
model = Sequential()
model.add(LSTM(units=50, return_sequences=True, input_shape=(X_train.shape[1], X_train.shape[2])))
model.add(LSTM(units=50))
model.add(Dense(1))  # Output a single value
model.compile(optimizer='adam', loss='mean_squared_error')

# Train the model
model.fit(X_train, y_train, epochs=10, batch_size=64)

# Predicting next 7 days
next_week_predictions = []

# Predict next day price based on last 100 days data
inputs = scaled_data[-time_step:].reshape(1, time_step, 1)
for i in range(7):
    next_price = model.predict(inputs)
    next_week_predictions.append(next_price[0][0])
    inputs = np.append(inputs[:, 1:, :], next_price.reshape(1, 1, 1), axis=1)

# Inverse transform the predicted values to get the actual OHLC prices
next_week_predictions = scaler.inverse_transform(np.array(next_week_predictions).reshape(-1, 1))

next_week_predictions_list = next_week_predictions.tolist()
# print(next_week_predictions_list)
rounded_list = [[round(num[0], 2)] for num in next_week_predictions_list]
# Convert the predicted OHLC values to a JSON-formatted string

predicted_json = json.dumps(rounded_list)

# Print the predicted OHLC values in JSON format to stdout
sys.stdout.write(predicted_json)