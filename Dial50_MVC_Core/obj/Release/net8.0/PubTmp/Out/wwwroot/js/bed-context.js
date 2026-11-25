(function () {
    var S = window.__bedServer || {};
    var params = new URLSearchParams(window.location.search);

    function pick(serverVal, key) {
        return serverVal || sessionStorage.getItem(key) || '';
    }

    var ctx = {
        bedInfo: params.get('BedInfo') || S.bedInfo || sessionStorage.getItem('bedInfo') || '',
        region: params.get('region') || S.region || sessionStorage.getItem('region') || '',
        tenantId: params.get('XTenantID') || S.tenantId || sessionStorage.getItem('XTenantID') || '',
        bedId: pick(S.bedId, 'BedId'),
        userId: pick(S.userId, 'userId'),
        hasPatient: !!S.hasPatient,
        patientName: pick(S.patientName, 'PatientName'),
        roomNumber: pick(S.roomNumber, 'RoomNumber'),
        bedNumber: pick(S.bedNumber, 'BedNumber'),
        roomBed: pick(S.roomBed, 'RoomBed'),
        ward: pick(S.ward, 'Ward'),
        uhid: pick(S.uhid, 'Uhid'),
        gender: pick(S.gender, 'Gender'),
        age: pick(S.age, 'Age'),
        dietType: pick(S.dietType, 'DietType'),
        allergies: pick(S.allergies, 'Allergies'),
        tier: pick(S.tier, 'Tier'),
        tierCode: pick(S.tierCode, 'TierCode'),
        tierLevel: pick(S.tierLevel, 'TierLevel')
    };

    function save(key, val) { if (val) sessionStorage.setItem(key, val); }
    save('bedInfo', ctx.bedInfo);
    save('region', ctx.region);
    save('XTenantID', ctx.tenantId); // Saved for API headers
    save('BedId', ctx.bedId);
    save('realBedId', ctx.bedId);
    save('userId', ctx.userId);
    save('PatientName', ctx.patientName);
    save('RoomNumber', ctx.roomNumber);
    save('BedNumber', ctx.bedNumber);
    save('RoomBed', ctx.roomBed);
    save('Ward', ctx.ward);
    save('Uhid', ctx.uhid);
    save('Gender', ctx.gender);
    save('Age', ctx.age);
    save('DietType', ctx.dietType);
    save('Allergies', ctx.allergies);
    save('Tier', ctx.tier);
    save('TierCode', ctx.tierCode);
    save('TierLevel', ctx.tierLevel);
    sessionStorage.setItem('hasPatient', ctx.hasPatient ? '1' : '0');

    window.BedContext = {
        get: function () { return ctx; },
        taskBedId: function () { return ctx.bedId || ctx.bedInfo; },
        taskBedNumber: function () { return ctx.roomBed || ctx.bedNumber || ctx.roomNumber; },

        getTenantId: function () { return ctx.tenantId; },

        url: function (page, extra) {
            var u = '/' + String(page).replace(/^\//, '') + '?BedInfo=' + encodeURIComponent(ctx.bedInfo);
            var tenantId = ctx.tenantId || sessionStorage.getItem('XTenantID') || '';
            var region = ctx.region || sessionStorage.getItem('region') || '';
            if (tenantId) u += '&XTenantID=' + encodeURIComponent(tenantId);
            if (region) u += '&region=' + encodeURIComponent(region);
            if (params.get('UnifiedAI') === '1' || params.get('Unified') === '1') {
                u += '&Unified=1&UnifiedAI=1';
            }

            if (extra) {
                Object.keys(extra).forEach(function (k) {
                    u += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(extra[k]);
                });
            }
            return u;
        },

        go: function (page, extra) { window.location.href = this.url(page, extra); }
    };

    if (typeof window.refreshHeaderFromSession === 'function') window.refreshHeaderFromSession();
})();