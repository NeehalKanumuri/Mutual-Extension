#import <Cocoa/Cocoa.h>
#import <SafariServices/SafariServices.h>

@interface AppDelegate : NSObject <NSApplicationDelegate>
@property (strong) NSWindow *window;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    NSRect frame = NSMakeRect(0, 0, 520, 480);
    self.window = [[NSWindow alloc] initWithContentRect:frame
                                             styleMask:(NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable)
                                               backing:NSBackingStoreBuffered
                                                 defer:NO];
    [self.window setTitle:@"The Mutual — Safari Setup & Bridge"];
    [self.window setBackgroundColor:[NSColor windowBackgroundColor]];

    NSView *contentView = self.window.contentView;

    // Header label
    NSTextField *title = [[NSTextField alloc] initWithFrame:NSMakeRect(30, 410, 460, 40)];
    title.stringValue = @"The Mutual for Safari";
    title.font = [NSFont systemFontOfSize:22 weight:NSFontWeightBold];
    title.textColor = [NSColor labelColor];
    title.bezeled = NO;
    title.drawsBackground = NO;
    title.editable = NO;
    title.selectable = NO;
    [contentView addSubview:title];

    // Subtitle
    NSTextField *sub = [[NSTextField alloc] initWithFrame:NSMakeRect(30, 385, 460, 24)];
    sub.stringValue = @"Behavioral Alignment, Ambiguity Interceptor & Delegation Handshake";
    sub.font = [NSFont systemFontOfSize:12 weight:NSFontWeightRegular];
    sub.textColor = [NSColor secondaryLabelColor];
    sub.bezeled = NO;
    sub.drawsBackground = NO;
    sub.editable = NO;
    sub.selectable = NO;
    [contentView addSubview:sub];

    // Status pill
    NSBox *box = [[NSBox alloc] initWithFrame:NSMakeRect(30, 335, 460, 42)];
    box.boxType = NSBoxCustom;
    box.borderType = NSLineBorder;
    box.borderColor = [NSColor colorWithRed:0.18 green:0.42 blue:0.31 alpha:0.3];
    box.fillColor = [NSColor colorWithRed:0.91 green:0.96 blue:0.92 alpha:1.0];
    box.cornerRadius = 8.0;

    NSTextField *statusLabel = [[NSTextField alloc] initWithFrame:NSMakeRect(14, 10, 430, 20)];
    statusLabel.stringValue = @"● Ready for Safari — Web Extension Bundle Built & Signed";
    statusLabel.font = [NSFont systemFontOfSize:12 weight:NSFontWeightSemibold];
    statusLabel.textColor = [NSColor colorWithRed:0.11 green:0.35 blue:0.22 alpha:1.0];
    statusLabel.bezeled = NO;
    statusLabel.drawsBackground = NO;
    statusLabel.editable = NO;
    statusLabel.selectable = NO;
    [box addSubview:statusLabel];
    [contentView addSubview:box];

    // Instructions Box
    NSTextView *guide = [[NSTextView alloc] initWithFrame:NSMakeRect(30, 160, 460, 160)];
    guide.string = @"Quick 30-Second Safari Activation Guide:\n\n"
                   @"1. Open Safari Settings:\n"
                   @"   • Safari Menu → Settings → Advanced\n"
                   @"   • Check \"Show features for web developers\" (or \"Show Develop menu\")\n\n"
                   @"2. Allow Developer Extension:\n"
                   @"   • In Safari top menu bar, click \"Develop\"\n"
                   @"   • Click \"Allow Unsigned Extensions\" (authenticate with Mac password/Touch ID)\n\n"
                   @"3. Enable The Mutual:\n"
                   @"   • In Safari Settings → Extensions, check the box for \"The Mutual\"\n"
                   @"   • Click \"Always Allow on Every Website\"";
    guide.font = [NSFont systemFontOfSize:12 weight:NSFontWeightRegular];
    guide.backgroundColor = [NSColor clearColor];
    guide.textColor = [NSColor labelColor];
    guide.editable = NO;
    guide.selectable = YES;
    [contentView addSubview:guide];

    // Button 1: Open Safari Extension Preferences
    NSButton *btnPref = [[NSButton alloc] initWithFrame:NSMakeRect(30, 95, 220, 38)];
    btnPref.title = @"Open Safari Extensions";
    btnPref.bezelStyle = NSBezelStyleRounded;
    btnPref.target = self;
    btnPref.action = @selector(openSafariExtensions:);
    [contentView addSubview:btnPref];

    // Button 2: Launch Web Companion in Safari
    NSButton *btnWeb = [[NSButton alloc] initWithFrame:NSMakeRect(260, 95, 230, 38)];
    btnWeb.title = @"Open Companion in Safari";
    btnWeb.bezelStyle = NSBezelStyleRounded;
    btnWeb.target = self;
    btnWeb.action = @selector(openWebCompanion:);
    [contentView addSubview:btnWeb];

    // Footer note
    NSTextField *footer = [[NSTextField alloc] initWithFrame:NSMakeRect(30, 35, 460, 45)];
    footer.stringValue = @"Tip: In Safari, on Google Meet, Zoom, Teams, or Slack, press Option+M (⌥M) or click the green badge to open the floating Side Panel drawer.";
    footer.font = [NSFont systemFontOfSize:11 weight:NSFontWeightRegular];
    footer.textColor = [NSColor tertiaryLabelColor];
    footer.bezeled = NO;
    footer.drawsBackground = NO;
    footer.editable = NO;
    footer.selectable = NO;
    [contentView addSubview:footer];

    [self.window center];
    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];
}

- (void)openSafariExtensions:(id)sender {
    [SFSafariApplication showPreferencesForExtensionWithIdentifier:@"com.themutual.safari.Extension" completionHandler:^(NSError * _Nullable error) {
        if (error) {
            // Fallback: Open Safari settings directly
            [[NSWorkspace sharedWorkspace] openURL:[NSURL URLWithString:@"x-apple.systempreferences:"]];
        }
    }];
}

- (void)openWebCompanion:(id)sender {
    [[NSWorkspace sharedWorkspace] openURL:[NSURL URLWithString:@"http://localhost:8000"]];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return NO;
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
