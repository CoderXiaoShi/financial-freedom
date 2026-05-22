const fs = require("fs");
const { execSync } = require("child_process");

execSync("rm -rf output.mp3");

const data = JSON.stringify({
    app: {
        cluster: "volcano_icl"
    },
    user: {
        uid: "豆包语音"
    },
    audio: {
        voice_type: "S_4BJYYsm32",
        encoding: "mp3",
        speed_ratio: 1.0
    },
    request: {
        reqid: `${Date.now()}_02177937671695300000000000000000000ffff0a2e6d2fb63fe6`,
        text: `我是"至尊宝", 是你的贴身财务管家. 
        以后你的每一笔花销都要经过我审核, 你的每一笔投资都要我来管理. 
        我会陪你一起走向财务自由!但前提是你得听我安排!`,
        // text: "你个废物! 连这点事情都坚持不下来. 没用的东西!!",
        // text: "你都买了啥! 把没用的东西都退掉!!",
        // text: "这就对了嘛~, 接下来咱们要紧衣缩食啊",
        // text: "你的零花钱, 还有250块. 坚持一下, 马上就要发工资啦~",
        // text: "卧槽怎么回事!!!! 又花了 32块钱! 你都不看看你快没钱啦! 还有大半个月呢!你撑得下去么",
        operation: "query"
    }
});

let t = Date.now();
fetch("https://openspeech.bytedance.com/api/v1/tts", {
    method: "POST",
    headers: {
        "x-api-key": "1687cc88-3f0e-43fe-b582-1b6ac756033e",
        "Content-Type": "application/json"
    },
    body: data,
    redirect: "follow"
}).then(res => res.json()).then(json => {
    // 常见的音频数据字段名
    const audioField = json.data || json.audio || json.audio_data || json.result;

    if (!audioField) {
        console.log("Response keys:", Object.keys(json));
        console.log("Full response:", JSON.stringify(json, null, 2).slice(0, 500));
        throw new Error("未找到音频数据字段，请根据上面输出的 key 手动指定");
    }

    if (typeof audioField === "string") {
        // 可能是 base64 编码或 URL
        if (audioField.startsWith("http")) {
            return fetch(audioField).then(r => r.arrayBuffer());
        }
        return Buffer.from(audioField, "base64");
    }

    throw new Error(`无法处理的音频数据类型: ${typeof audioField}`);
}).then(buf => {
    fs.writeFileSync("output.mp3", Buffer.from(buf));
    console.log(`Saved output.mp3 (${buf.byteLength} bytes)`);
    console.log(`Cost ${Date.now() - t}ms`);
}).catch(err => {
    console.error("Request failed:", err.message);
});
