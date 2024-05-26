# Use an official Node.js runtime as a parent image
FROM node:14

# Install ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages
RUN npm install

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Define environment variable
ENV NODE_ENV production

# Run app when the container launches
CMD ["node", "server.js"]
