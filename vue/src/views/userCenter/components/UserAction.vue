<template>
    <div v-loading="loading">
        <el-table :data="tableData">
            <el-table-column align="center" label="#" type="index" width="60">
                <el-button icon="el-icon-refresh-right" slot="header" style="padding: 0" type="text" @click="search"/>
            </el-table-column>
            <el-table-column align="center" label="ip" prop="ip" show-overflow-tooltip/>
            <el-table-column align="center" label="操作" prop="action" show-overflow-tooltip/>
            <el-table-column align="center" label="时间" show-overflow-tooltip>
                <template v-slot="{row}">{{row.time | timestamp2Date}}</template>
            </el-table-column>
            <el-table-column align="center" label="状态" width="80">
                <template v-slot="{row}">
                    <el-tooltip :disabled="row.type!==0" placement="left">
                        <div slot="content" style="max-width: 60vw">
                            <el-scrollbar wrap-class="el-select-dropdown__wrap">
                                <p>{{row.error}}</p>
                            </el-scrollbar>
                        </div>
                        <el-tag :type="row.type===1?'success':'danger'" effect="dark">
                            {{getInfo(row.type)}}
                        </el-tag>
                    </el-tooltip>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination
                background
                :current-page="searchForm.page"
                :page-size="searchForm.pageSize"
                :total="searchForm.total"
                layout="total, prev, pager, next, jumper"
                @current-change="pageChange"
        />
    </div>
</template>

<script>
    import {getUserAction} from "@/api/system/user"

    export default {
        name: "UserAction",
        data() {
            return {
                searchForm: {
                    page: 1,
                    pageSize: 10,
                    total: 0
                },
                loading: false,
                tableData: []
            }
        },
        computed: {
            uid() {
                return this.$store.state.user.id
            }
        },
        methods: {
            pageChange(v) {
                this.searchForm.page = v
                this.search()
            },
            search() {
                if (this.loading) return
                this.loading = true
                getUserAction({...this.searchForm, uid: this.uid})
                    .then(({list, total}) => {
                        this.searchForm.total = total
                        this.tableData = list
                    })
                    .finally(() => this.loading = false)
            },
            getInfo(type) {
                switch (type) {
                    case 0:
                        return '失败'
                    case 1:
                        return '成功'
                }
                return null
            }
        },
        mounted() {
            this.search()
        }
    }
</script>
