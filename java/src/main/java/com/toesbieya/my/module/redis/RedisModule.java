package com.toesbieya.my.module.redis;

import com.toesbieya.my.utils.DateUtil;
import com.toesbieya.my.utils.RedisUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class RedisModule {
    public static final String DOCUMENTS_KEY = "documentsID";
    public static final String[] DOCUMENTS_TYPE = {"CGDD", "CGRK", "CGTH", "XSDD", "XSCK", "XSTH"};
    private RedisUtil redisUtil;

    @PostConstruct
    public void init() {
        Instant start = Instant.now();

        initDocumentsID();

        Instant end = Instant.now();
        log.info("redis模块启动成功，耗时：{}毫秒", ChronoUnit.MILLIS.between(start, end));
    }

    //初始化单据ID
    private void initDocumentsID() {
        String[] fields = new String[DOCUMENTS_TYPE.length + 1];
        fields[0] = "date";
        System.arraycopy(DOCUMENTS_TYPE, 0, fields, 1, fields.length - 1);
        List<Object> result = RedisUtil.hmget(DOCUMENTS_KEY, fields);

        long now = DateUtil.getTimestampNow();

        //日期不是今天时，更新全部，初始值为1
        if (null == result.get(0) || now != (long) result.get(0)) {
            updateAllDocument(now);
            log.info("更新【{}】种单据ID成功", DOCUMENTS_TYPE.length);
            return;
        }

        //判断是否有新增的单据类型，有则更新
        int updateNum = 0;
        Map<String, Object> update = new HashMap<>();
        int resultSize = result.size();
        for (int i = 1; i < resultSize; i++) {
            if (result.get(i) == null) {
                updateNum++;
                update.put(DOCUMENTS_TYPE[i - 1], 1);
            }
        }
        if (updateNum > 0) {
            RedisUtil.hmset(DOCUMENTS_KEY, update);
            log.info("更新增加的单据【{}】种", updateNum);
        }
    }

    private void updateAllDocument(long now) {
        Map<String, Object> map = new HashMap<>();
        map.put("date", now);
        for (String v : DOCUMENTS_TYPE) {
            map.put(v, 1);
        }
        RedisUtil.hmset(DOCUMENTS_KEY, map);
    }

    //每天零点初始化单据ID
    @Async("scheduledExecutor")
    @Scheduled(cron = "1 0 0 */1 * ?")
    public void autoRefreshDocumentID() {
        log.info("开始定时更新单据ID......当前共有【{}】种待更新......", DOCUMENTS_TYPE.length);
        try (LockHelper locker = new RedisLockHelper(RedisLockType.UPDATE_DOCUMENT_ID)) {
            if (!locker.lock()) {
                log.error("定时更新单据ID失败，获取锁【{}】失败", RedisLockType.UPDATE_DOCUMENT_ID);
                return;
            }
            updateAllDocument(DateUtil.getTimestampNow());
            log.info("定时更新单据ID结束，成功更新【{}】种", DOCUMENTS_TYPE.length);
        } catch (Exception e) {
            log.error("定时更新单据ID失败", e);
        }
    }

    @Autowired
    public void setRedisUtil(RedisUtil redisUtil) {
        this.redisUtil = redisUtil;
    }
}
