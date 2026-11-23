import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

/**
 * The app delegate owns the React Native factory; the scene delegate owns the
 * window.
 *
 * iOS and iPadOS 27 require the UIScene lifecycle for an app built with the 27
 * SDK: without a scene manifest and a scene delegate UIKit raises a runtime
 * issue the moment the first scene is created, and the app is killed on launch
 * (`UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`, App Review's
 * crash on an iPad Air). Before, the window was made here in
 * `didFinishLaunching`; a window now needs its scene, which does not exist yet.
 *
 * The factory is still built here, at launch, because it is the thing the
 * rest of the app expects to exist, and a scene delegate cannot create it
 * before it has been asked for the app delegate's.
 */
@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    return true
  }

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window

    // `startReactNative` installs the root view controller and makes the window
    // key and visible.
    factory.startReactNative(
      withModuleName: "AirLink",
      in: window,
      launchOptions: nil
    )
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
