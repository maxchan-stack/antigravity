function doGet(e) {
    return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('SSO 登入測試')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getUserIdentity() {
    try {
        // 核心 SSO 提取語法
        var email = Session.getActiveUser().getEmail();
        
        if (!email) {
            return {
                success: false,
                message: "無法取得您的 Google 帳號。請確認您已登入。"
            };
        }
        
        // 解析信箱，嘗試分離出帳號部分（通常為學號或教職員編號）
        var accountName = email.split('@')[0];
        var domainName = email.split('@')[1];
        
        return {
            success: true,
            email: email,
            account: accountName,
            domain: domainName
        };
    } catch (e) {
        return {
            success: false,
            message: "發生錯誤：" + e.toString()
        };
    }
}
