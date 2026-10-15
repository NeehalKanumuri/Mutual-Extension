#import <Foundation/Foundation.h>
#import <SafariServices/SafariServices.h>

@interface SafariWebExtensionHandler : NSObject <NSExtensionRequestHandling>
@end

@implementation SafariWebExtensionHandler

- (void)beginRequestWithExtensionContext:(NSExtensionContext *)context {
    NSExtensionItem *response = [[NSExtensionItem alloc] init];
    response.userInfo = @{ @"status": @"The Mutual Safari Extension active" };
    [context completeRequestReturningItems:@[response] completionHandler:nil];
}

@end
