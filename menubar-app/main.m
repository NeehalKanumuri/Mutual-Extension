#import <Cocoa/Cocoa.h>

@interface AppDelegate : NSObject <NSApplicationDelegate>
@property (strong, nonatomic) NSStatusItem *statusItem;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    // Accessory application (lives in menu bar only, no dock icon)
    [NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];

    // Create status bar item in top menu bar
    self.statusItem = [[NSStatusBar systemStatusBar] statusItemWithLength:NSVariableStatusItemLength];
    self.statusItem.button.title = @"🎙️ The Mutual";
    self.statusItem.button.toolTip = @"The Mutual — Whisper Large-v3-Turbo Background Transcriber";

    [self buildMenu];

    // Periodic health check on backend
    [NSTimer scheduledTimerWithTimeInterval:5.0
                                     target:self
                                   selector:@selector(checkBackendHealth)
                                   userInfo:nil
                                    repeats:YES];
}

- (void)buildMenu {
    NSMenu *menu = [[NSMenu alloc] init];

    // Header items
    NSMenuItem *titleItem = [[NSMenuItem alloc] initWithTitle:@"🎙️ The Mutual (Whisper Large-v3-Turbo)" action:nil keyEquivalent:@""];
    [titleItem setEnabled:NO];
    [menu addItem:titleItem];

    NSMenuItem *statusItem = [[NSMenuItem alloc] initWithTitle:@"🟢 Status: Background Engine Active" action:nil keyEquivalent:@""];
    statusItem.tag = 101;
    [statusItem setEnabled:NO];
    [menu addItem:statusItem];

    NSMenuItem *modelItem = [[NSMenuItem alloc] initWithTitle:@"🧠 Model: openai/whisper-large-v3-turbo" action:nil keyEquivalent:@""];
    [modelItem setEnabled:NO];
    [menu addItem:modelItem];

    [menu addItem:[NSMenuItem separatorItem]];

    // Interactive actions
    NSMenuItem *openPanelItem = [[NSMenuItem alloc] initWithTitle:@"Slide Out Side Panel (⌥M)" action:@selector(openSidePanel:) keyEquivalent:@"m"];
    [openPanelItem setKeyEquivalentModifierMask:NSEventModifierFlagOption];
    [openPanelItem setTarget:self];
    [menu addItem:openPanelItem];

    NSMenuItem *openWebItem = [[NSMenuItem alloc] initWithTitle:@"Open Web Companion (http://localhost:8000)" action:@selector(openWebCompanion:) keyEquivalent:@"w"];
    [openWebItem setTarget:self];
    [menu addItem:openWebItem];

    NSMenuItem *openHfItem = [[NSMenuItem alloc] initWithTitle:@"View Model on Hugging Face..." action:@selector(openHuggingFace:) keyEquivalent:@""];
    [openHfItem setTarget:self];
    [menu addItem:openHfItem];

    [menu addItem:[NSMenuItem separatorItem]];

    NSMenuItem *restartItem = [[NSMenuItem alloc] initWithTitle:@"Restart Whisper Engine" action:@selector(restartEngine:) keyEquivalent:@"r"];
    [restartItem setTarget:self];
    [menu addItem:restartItem];

    NSMenuItem *quitItem = [[NSMenuItem alloc] initWithTitle:@"Quit The Mutual Menu Bar" action:@selector(quitApp:) keyEquivalent:@"q"];
    [quitItem setTarget:self];
    [menu addItem:quitItem];

    self.statusItem.menu = menu;
}

- (void)checkBackendHealth {
    NSURL *url = [NSURL URLWithString:@"http://localhost:8000/api/health"];
    NSURLRequest *req = [NSURLRequest requestWithURL:url cachePolicy:NSURLRequestReloadIgnoringLocalCacheData timeoutInterval:2.0];
    NSURLSessionDataTask *task = [[NSURLSession sharedSession] dataTaskWithRequest:req completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        dispatch_async(dispatch_get_main_queue(), ^{
            NSMenuItem *statusItem = [self.statusItem.menu itemWithTag:101];
            if (error || !data) {
                if (statusItem) statusItem.title = @"🟡 Status: Reconnecting Backend (Port 8000)...";
                self.statusItem.button.title = @"🎙️ The Mutual (Connecting)";
            } else {
                if (statusItem) statusItem.title = @"🟢 Status: Whisper Large-v3-Turbo Ready";
                self.statusItem.button.title = @"🎙️ The Mutual";
            }
        });
    }];
    [task resume];
}

- (void)openSidePanel:(id)sender {
    // Open companion or trigger Chrome/Safari side panel
    [[NSWorkspace sharedWorkspace] openURL:[NSURL URLWithString:@"http://localhost:8000"]];
}

- (void)openWebCompanion:(id)sender {
    [[NSWorkspace sharedWorkspace] openURL:[NSURL URLWithString:@"http://localhost:8000"]];
}

- (void)openHuggingFace:(id)sender {
    [[NSWorkspace sharedWorkspace] openURL:[NSURL URLWithString:@"https://huggingface.co/openai/whisper-large-v3-turbo"]];
}

- (void)restartEngine:(id)sender {
    // Ping restart or re-trigger server
    system("python3 backend/app/server.py &");
}

- (void)quitApp:(id)sender {
    [NSApp terminate:nil];
}

@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        AppDelegate *delegate = [[AppDelegate alloc] init];
        app.delegate = delegate;
        [app run];
    }
    return 0;
}
