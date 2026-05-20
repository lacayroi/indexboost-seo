-- CreateIndex
CREATE INDEX "QueueItem_shopId_url_engine_idx" ON "QueueItem"("shopId", "url", "engine");

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");
