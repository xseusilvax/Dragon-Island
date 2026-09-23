# Dragon Island

Dragon Island is a side scrolling platform game based on Super Mario World by Nintendo. The objective of this project is to create an exciting action game which is enjoyable to play. The players aim is to try and set a high score by getting to the end of each level before the time runs out while avoiding or destroying enemies and collecting power-ups.

The source code is written in Java, built as an Android Studio project.

Importing the Project
======================

1. Install Android Studio
2. Open the DragonIsland-Android-Studio project
3. Select Tools -> SDK Manager -> SDK Platforms tab and ensure Android API 34 is installed
4. Select Tools -> SDK Manager -> SDK Tools tab and ensure Android SDK Build-Tools 34 is installed
5. If there are still build errors try selecting File -> Invalidate Caches...

If you get an error stating SDK Location not found this is because the local.properties file is not found as it should not be checked into version control and should be generated automatically by Android Studio. If this happens create a new text file in the root of the project folder called local.properties and add the following specifying the location of your Android SDK folder:

```
sdk.dir=C\:\\Users\\User\\AppData\\Local\\Android\\Sdk
```

You should now be able to press the run button and launch the application on a connected device.

Acknowledgements
================

Special thanks to the artist [No-Body-The-Dragon](https://www.deviantart.com/no-body-the-dragon) who provided many of the graphics for the game.
