package com.toesbieya.my.model.vo.search;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public class PurchaseInboundSearch extends DocumentSearch {
    private String pid;
    private String pid_fuzzy;
}
