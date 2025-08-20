define([], function () {
    /**
     * 按键热力图管理类
     * 记录和可视化按键频率
     */
    class KeyHeatmap {
        constructor() {
            this.container = null;
            this.maxFrequency = 1;
            this.keyStats = this.loadKeyStats();
            this.keyPairStats = this.loadKeyPairStats(); // 新增：按键对统计
            this.lastKey = null; // 记录上一个按键，用于计算按键对
            
            // 左右手键位映射
            this.leftHandKeys = new Set([
                // 左手字母
                'Q', 'W', 'E', 'R', 'T',
                'A', 'S', 'D', 'F', 'G',
                'Z', 'X', 'C', 'V', 'B',
                // 左手数字
                '1', '2', '3', '4', '5',
                // 左手符号
                '`', 'Tab', 'Caps', 'LShift', 'LCtrl', 'LAlt', 'LCmd',
                // 左手符号(需要Shift的)
                '!', '@', '#', '$', '%', '~'
            ]);
            
            this.rightHandKeys = new Set([
                // 右手字母  
                'Y', 'U', 'I', 'O', 'P',
                'H', 'J', 'K', 'L',
                'N', 'M',
                // 右手数字 (宇浩：很多分体键盘的6在左手)
                '6', '7', '8', '9', '0',
                // 右手符号
                '-', '=', '[', ']', '\\', ';', "'", ',', '.', '/',
                'Backspace', 'Enter', 'RShift', 'RCtrl', 'RAlt', 'RCmd',
                // 右手符号(需要Shift的)
                '^', '&', '*', '(', ')', '_', '+', '{', '}', '|', ':', '"', '<', '>', '?'
            ]);
            
            // 当量表 - 从宇浩输入法项目获取
            this.equivTable = this.initEquivTable();
            
            this.init();
        }

        /**
         * 从localStorage加载按键统计数据
         */
        loadKeyStats() {
            const saved = localStorage.getItem('typepad_key_stats');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    const stats = data.stats || {};
                    // 重新计算maxFrequency，确保准确性
                    this.maxFrequency = Object.keys(stats).length > 0 
                        ? Math.max(...Object.values(stats)) 
                        : 1;
                    return stats;
                } catch (e) {
                    console.warn('Failed to load key stats:', e);
                }
            }
            this.maxFrequency = 1;
            return {};
        }

        /**
         * 保存按键统计数据到localStorage
         */
        saveKeyStats() {
            const data = {
                stats: this.keyStats,
                keyPairStats: this.keyPairStats,
                maxFrequency: this.maxFrequency,
                lastUpdate: Date.now()
            };
            localStorage.setItem('typepad_key_stats', JSON.stringify(data));
        }

        /**
         * 加载按键对统计数据
         */
        loadKeyPairStats() {
            const saved = localStorage.getItem('typepad_key_stats');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    return data.keyPairStats || {};
                } catch (e) {
                    console.warn('Failed to load key pair stats:', e);
                }
            }
            return {};
        }

        /**
         * 初始化当量表
         * 数据来源:《键位相关速度当量的研究》(陈一凡,张鹿,周志农)
         */
        initEquivTable() {
            const equivData = `_a,1.4
_b,1.4
_c,1.5
_d,1.4
_e,1.4
_f,1.4
_g,1.3
_h,1.3
_i,1.4
_j,1.4
_k,1.3
_l,1.3
_m,1.4
_n,1.3
_o,1.4
_p,1.4
_q,1.5
_r,1.4
_s,1.5
_t,1.5
_u,1.5
_v,1.5
_w,1.5
_x,1.4
_y,1.6
_z,1.5
a_,1.3
aa,1.3
ab,1.8
ac,1.7
ad,1.5
ae,1.5
af,1.5
ag,1.5
ah,1.1
ai,1.1
aj,1.1
ak,1.0
al,1.0
am,1.1
an,1.1
ao,1.1
ap,1.2
aq,1.9
ar,1.7
as,1.6
at,1.5
au,1.2
av,1.5
aw,1.8
ax,1.9
ay,1.2
az,1.9
b_,1.2
ba,1.6
bb,1.3
bc,1.7
bd,1.6
be,1.7
bf,1.9
bg,1.8
bh,1.2
bi,1.1
bj,1.2
bk,1.2
bl,1.1
bm,1.1
bn,1.1
bo,1.1
bp,1.1
bq,1.8
br,1.9
bs,1.7
bt,1.9
bu,1.2
bv,1.8
bw,1.8
bx,1.7
by,1.3
bz,1.6
c_,1.2
ca,1.6
cb,1.6
cc,1.3
cd,1.7
ce,1.8
cf,1.7
cg,1.7
ch,1.1
ci,1.1
cj,1.1
ck,1.0
cl,1.0
cm,1.1
cn,1.0
co,1.1
cp,1.1
cq,1.8
cr,1.9
cs,1.6
ct,1.9
cu,1.1
cv,1.5
cw,1.8
cx,1.6
cy,1.2
cz,1.4
d_,1.3
da,1.4
db,1.7
dc,1.9
dd,1.3
de,1.6
df,1.5
dg,1.5
dh,1.1
di,1.0
dj,1.1
dk,1.1
dl,1.1
dm,1.1
dn,1.1
do,1.1
dp,1.1
dq,1.6
dr,1.7
ds,1.4
dt,1.7
du,1.1
dv,1.6
dw,1.6
dx,1.7
dy,1.2
dz,1.5
e_,1.5
ea,1.5
eb,1.8
ec,1.9
ed,1.8
ee,1.3
ef,1.5
eg,1.6
eh,1.1
ei,1.1
ej,1.0
ek,1.0
el,1.1
em,1.1
en,1.1
eo,1.0
ep,1.2
eq,1.4
er,1.3
es,1.7
et,1.6
eu,1.1
ev,1.7
ew,1.4
ex,2.0
ey,1.2
ez,1.8
f_,1.3
fa,1.3
fb,1.8
fc,1.8
fd,1.5
fe,1.4
ff,1.3
fg,1.8
fh,1.1
fi,1.2
fj,1.1
fk,1.1
fl,1.1
fm,1.2
fn,1.1
fo,1.1
fp,1.1
fq,1.5
fr,1.7
fs,1.5
ft,1.7
fu,1.2
fv,1.8
fw,1.4
fx,1.7
fy,1.2
fz,1.6
g_,1.4
ga,1.4
gb,1.8
gc,1.8
gd,1.5
ge,1.4
gf,1.6
gg,1.3
gh,1.2
gi,1.1
gj,1.1
gk,1.1
gl,1.1
gm,1.1
gn,1.1
go,1.1
gp,1.1
gq,1.4
gr,1.8
gs,1.5
gt,1.7
gu,1.1
gv,1.8
gw,1.5
gx,1.7
gy,1.1
gz,1.6
h_,1.3
ha,1.2
hb,1.2
hc,1.2
hd,1.1
he,1.1
hf,1.2
hg,1.5
hh,1.3
hi,1.3
hj,1.6
hk,1.5
hl,1.4
hm,1.8
hn,1.6
ho,1.4
hp,1.4
hq,1.2
hr,1.1
hs,1.1
ht,1.1
hu,1.5
hv,1.2
hw,1.1
hx,1.2
hy,1.5
hz,1.2
i_,1.3
ia,1.2
ib,1.2
ic,1.2
id,1.1
ie,1.1
if,1.1
ig,1.2
ih,1.7
ii,1.3
ij,1.5
ik,1.6
il,1.6
im,1.7
in,1.5
io,1.4
ip,1.5
iq,1.2
ir,1.1
is,1.1
it,1.1
iu,1.4
iv,1.2
iw,1.1
ix,1.2
iy,1.6
iz,1.3
j_,1.2
ja,1.1
jb,1.2
jc,1.1
jd,1.1
je,1.1
jf,1.2
jg,1.2
jh,1.6
ji,1.5
jj,1.3
jk,1.3
jl,1.4
jm,1.8
jn,1.6
jo,1.5
jp,1.4
jq,1.3
jr,1.1
js,1.2
jt,1.1
ju,1.6
jv,1.2
jw,1.2
jx,1.2
jy,1.8
jz,1.3
k_,1.2
ka,1.2
kb,1.1
kc,1.2
kd,1.1
ke,1.1
kf,1.2
kg,1.2
kh,1.6
ki,1.6
kj,1.5
kk,1.3
kl,1.3
km,1.6
kn,1.6
ko,1.6
kp,1.8
kq,1.2
kr,1.1
ks,1.1
kt,1.1
ku,1.6
kv,1.2
kw,1.1
kx,1.3
ky,1.7
kz,1.3
l_,1.2
la,1.2
lb,1.2
lc,1.2
ld,1.1
le,1.1
lf,1.1
lg,1.3
lh,1.7
li,1.5
lj,1.6
lk,1.6
ll,1.4
lm,1.7
ln,1.7
lo,1.7
lp,1.8
lq,1.3
lr,1.1
ls,1.1
lt,1.1
lu,1.6
lv,1.2
lw,1.2
lx,1.2
ly,1.8
lz,1.3
m_,1.3
ma,1.2
mb,1.1
mc,1.2
md,1.1
me,1.1
mf,1.2
mg,1.1
mh,1.8
mi,1.6
mj,1.6
mk,1.6
ml,1.5
mm,1.3
mn,1.6
mo,1.7
mp,1.7
mq,1.3
mr,1.1
ms,1.2
mt,1.2
mu,1.8
mv,1.2
mw,1.2
mx,1.3
my,2.0
mz,1.3
n_,1.2
na,1.2
nb,1.2
nc,1.2
nd,1.1
ne,1.1
nf,1.2
ng,1.2
nh,1.7
ni,1.5
nj,1.6
nk,1.6
nl,1.5
nm,1.7
nn,1.3
no,1.5
np,1.6
nq,1.3
nr,1.1
ns,1.2
nt,1.1
nu,1.7
nv,1.2
nw,1.1
nx,1.3
ny,1.8
nz,1.3
o_,1.3
oa,1.1
ob,1.1
oc,1.2
od,1.1
oe,1.1
of,1.1
og,1.1
oh,1.4
oi,1.5
oj,1.5
ok,1.8
ol,1.7
om,1.7
on,1.5
oo,1.4
op,1.5
oq,1.3
or,1.2
os,1.1
ot,1.1
ou,1.3
ov,1.3
ow,1.1
ox,1.2
oy,1.5
oz,1.3
p_,1.3
pa,1.1
pb,1.1
pc,1.1
pd,1.1
pe,1.1
pf,1.0
pg,1.1
ph,1.6
pi,1.6
pj,1.6
pk,1.9
pl,1.9
pm,1.7
pn,1.8
po,1.7
pp,1.3
pq,1.3
pr,1.2
ps,1.1
pt,1.3
pu,1.5
pv,1.3
pw,1.3
px,1.2
py,1.6
pz,1.2
q_,1.1
qa,1.9
qb,1.9
qc,2.1
qd,1.9
qe,1.7
qf,1.6
qg,1.7
qh,1.1
qi,1.1
qj,1.1
qk,1.1
ql,1.1
qm,1.1
qn,1.1
qo,1.2
qp,1.3
qq,1.3
qr,1.4
qs,2.1
qt,1.6
qu,1.2
qv,1.7
qw,1.7
qx,2.1
qy,1.2
qz,2.0
r_,1.4
ra,1.5
rb,1.9
rc,2.0
rd,1.7
re,1.4
rf,1.7
rg,1.7
rh,1.1
ri,1.1
rj,1.1
rk,1.2
rl,1.1
rm,1.2
rn,1.1
ro,1.2
rp,1.2
rq,1.5
rr,1.3
rs,1.7
rt,1.7
ru,1.1
rv,1.9
rw,1.5
rx,2.0
ry,1.2
rz,2.0
s_,1.4
sa,1.6
sb,1.7
sc,1.8
sd,1.5
se,1.5
sf,1.5
sg,1.5
sh,1.1
si,1.1
sj,1.1
sk,1.1
sl,1.1
sm,1.1
sn,1.1
so,1.1
sp,1.1
sq,1.7
sr,1.6
ss,1.3
st,1.6
su,1.1
sv,1.6
sw,1.7
sx,1.8
sy,1.1
sz,1.8
t_,1.3
ta,1.5
tb,1.9
tc,2.0
td,1.7
te,1.4
tf,1.7
tg,1.7
th,1.1
ti,1.1
tj,1.1
tk,1.1
tl,1.1
tm,1.1
tn,1.1
to,1.1
tp,1.1
tq,1.4
tr,1.7
ts,1.5
tt,1.3
tu,1.2
tv,2.0
tw,1.5
tx,2.1
ty,1.2
tz,1.9
u_,1.3
ua,1.1
ub,1.1
uc,1.1
ud,1.1
ue,1.1
uf,1.1
ug,1.1
uh,1.6
ui,1.4
uj,1.6
uk,1.7
ul,1.6
um,1.8
un,1.7
uo,1.4
up,1.3
uq,1.1
ur,1.1
us,1.2
ut,1.3
uu,1.3
uv,1.2
uw,1.2
ux,1.2
uy,1.5
uz,1.3
v_,1.2
va,1.5
vb,1.8
vc,1.6
vd,1.6
ve,1.6
vf,1.7
vg,1.8
vh,1.1
vi,1.1
vj,1.1
vk,1.1
vl,1.2
vm,1.1
vn,1.2
vo,1.2
vp,1.3
vq,1.7
vr,1.9
vs,1.5
vt,1.9
vu,1.4
vv,1.3
vw,1.5
vx,1.5
vy,1.3
vz,1.4
w_,1.4
wa,1.8
wb,1.9
wc,2.1
wd,1.9
we,1.5
wf,1.6
wg,1.6
wh,1.1
wi,1.1
wj,1.1
wk,1.1
wl,1.1
wm,1.2
wn,1.1
wo,1.1
wp,1.2
wq,1.6
wr,1.5
ws,1.8
wt,1.5
wu,1.2
wv,1.9
ww,1.3
wx,2.0
wy,1.2
wz,2.0
x_,1.3
xa,1.7
xb,1.5
xc,1.5
xd,1.5
xe,1.8
xf,1.7
xg,1.5
xh,1.1
xi,1.1
xj,1.0
xk,1.1
xl,1.0
xm,1.1
xn,1.1
xo,1.1
xp,1.1
xq,2.0
xr,1.7
xs,1.7
xt,1.8
xu,1.1
xv,1.6
xw,1.9
xx,1.3
xy,1.2
xz,1.7
y_,1.3
ya,1.2
yb,1.1
yc,1.1
yd,1.1
ye,1.1
yf,1.1
yg,1.1
yh,1.6
yi,1.4
yj,1.8
yk,1.7
yl,1.7
ym,1.9
yn,1.7
yo,1.5
yp,1.4
yq,1.2
yr,1.2
ys,1.1
yt,1.3
yu,1.5
yv,1.3
yw,1.3
yx,1.5
yy,1.3
yz,1.3
z_,1.3
za,1.8
zb,1.5
zc,1.6
zd,1.7
ze,1.8
zf,1.7
zg,1.7
zh,1.0
zi,1.1
zj,1.0
zk,1.1
zl,1.1
zm,1.0
zn,1.1
zo,1.2
zp,1.1
zq,2.1
zr,1.8
zs,1.9
zt,1.7
zu,1.2
zv,1.5
zw,2.1
zx,1.5
zy,1.4
zz,1.3
;a,1.2
;b,1.2
;c,1.1
;d,1.1
;e,1.2
;f,1.1
;g,1.2
;h,1.7
;i,1.8
;j,1.7
;k,1.8
;l,2.0
;m,1.9
;n,1.8
;o,2.1
;p,1.8
;q,1.2
;r,1.1
;s,1.1
;t,1.2
;u,1.7
;v,1.2
;w,1.2
;x,1.2
;y,1.9
;z,1.3
;_,1.4
a;,1.3
b;,1.2
c;,1.2
d;,1.2
e;,1.2
f;,1.2
g;,1.2
h;,1.6
i;,1.8
j;,1.6
k;,1.7
l;,1.7
m;,1.8
n;,1.7
o;,1.9
p;,1.9
q;,1.2
r;,1.1
s;,1.2
t;,1.2
u;,1.6
v;,1.1
w;,1.2
x;,1.2
y;,1.7
z;,1.2
;;,1.4
_;,1.5`;

            const equivTable = new Map();
            
            // 解析当量数据
            equivData.split('\n').forEach(line => {
                if (line.trim()) {
                    const [keys, equiv] = line.split(',');
                    if (keys && equiv) {
                        equivTable.set(keys.trim(), parseFloat(equiv.trim()));
                    }
                }
            });
            
            return equivTable;
        }

        /**
         * 记录按键对频率
         */
        recordKeyPair(currentKey) {
            if (this.lastKey && currentKey) {
                const pair = `${this.lastKey}-${currentKey}`;
                this.keyPairStats[pair] = (this.keyPairStats[pair] || 0) + 1;
            }
            this.lastKey = currentKey;
        }

        /**
         * 重置按键对记录状态（用于新段落开始时）
         */
        resetKeyPairState() {
            this.lastKey = null;
        }

        /**
         * 判断按键属于哪只手
         */
        getKeyHand(key) {
            if (this.leftHandKeys.has(key)) {
                return 'left';
            } else if (this.rightHandKeys.has(key)) {
                return 'right';
            } else {
                // 对于Space等中性键，我们认为它是双手键
                return 'neutral';
            }
        }

        /**
         * 计算左右手互击率
         */
        calculateHandAlternationRate() {
            const totalPairs = Object.values(this.keyPairStats).reduce((sum, count) => sum + count, 0);
            if (totalPairs === 0) {
                return {
                    total: 0,
                    alternating: 0,
                    rate: 0,
                    leftToRight: 0,
                    rightToLeft: 0,
                    sameHand: 0
                };
            }

            let alternatingCount = 0;
            let leftToRightCount = 0;
            let rightToLeftCount = 0;
            let sameHandCount = 0;

            Object.entries(this.keyPairStats).forEach(([pair, count]) => {
                const [key1, key2] = pair.split('-');
                const hand1 = this.getKeyHand(key1);
                const hand2 = this.getKeyHand(key2);
                
                // 特殊处理包含空格的按键对
                if (key1 === 'Space' || key2 === 'Space') {
                    // 空格算作0.5个同手，0.5个互击
                    alternatingCount += count * 0.5;
                    sameHandCount += count * 0.5;
                    
                    // 根据非空格键的手部归属来分配左右互击
                    const nonSpaceKey = key1 === 'Space' ? key2 : key1;
                    const nonSpaceHand = this.getKeyHand(nonSpaceKey);
                    if (nonSpaceHand === 'left') {
                        leftToRightCount += count * 0.25; // 左手->空格(右手部分)
                        rightToLeftCount += count * 0.25; // 空格(左手部分)->左手
                    } else if (nonSpaceHand === 'right') {
                        leftToRightCount += count * 0.25; // 空格(左手部分)->右手
                        rightToLeftCount += count * 0.25; // 右手->空格(右手部分)
                    }
                    return;
                }
                
                // 跳过其他中性键的按键对
                if (hand1 === 'neutral' || hand2 === 'neutral') {
                    return;
                }
                
                if (hand1 !== hand2) {
                    alternatingCount += count;
                    if (hand1 === 'left' && hand2 === 'right') {
                        leftToRightCount += count;
                    } else if (hand1 === 'right' && hand2 === 'left') {
                        rightToLeftCount += count;
                    }
                } else {
                    sameHandCount += count;
                }
            });

            const validPairs = alternatingCount + sameHandCount;
            const rate = validPairs > 0 ? (alternatingCount / validPairs) * 100 : 0;

            const result = {
                total: Math.round(validPairs * 100) / 100, // 保留两位小数
                alternating: Math.round(alternatingCount * 100) / 100,
                rate: Math.round(rate * 100) / 100, // 保留两位小数
                leftToRight: Math.round(leftToRightCount * 100) / 100,
                rightToLeft: Math.round(rightToLeftCount * 100) / 100,
                sameHand: Math.round(sameHandCount * 100) / 100
            };
            
            return result;
        }

        /**
         * 计算加权平均当量
         * 使用按键对频率和当量表计算整体当量值
         * 详见: https://shurufa.app/docs/statistics.html
         */
        calculateWeightedEquivalent() {
            let totalWeightedEquiv = 0;
            let totalValidPairs = 0;
            
            Object.entries(this.keyPairStats).forEach(([pair, count]) => {
                // 将按键对转换为当量表格式
                const equivKey = this.convertPairToEquivKey(pair);
                
                if (equivKey && this.equivTable.has(equivKey)) {
                    const equiv = this.equivTable.get(equivKey);
                    totalWeightedEquiv += equiv * count;
                    totalValidPairs += count;
                }
            });
            
            const averageEquiv = totalValidPairs > 0 ? totalWeightedEquiv / totalValidPairs : 0;
            
            const result = {
                totalValidPairs,
                totalWeightedEquiv: Math.round(totalWeightedEquiv * 100) / 100,
                averageEquiv: Math.round(averageEquiv * 100) / 100
            };
            
            return result;
        }

        /**
         * 将按键对转换为当量表中的键格式
         * 例如：'A-Space' -> 'a_', 'Space-B' -> '_b'
         */
        convertPairToEquivKey(pair) {
            const [key1, key2] = pair.split('-');
            
            // 转换为当量表格式：小写字母，空格用_表示
            const convertKey = (key) => {
                if (key === 'Space') {
                    return '_';
                }
                // 只处理字母和分号，其他键忽略
                if (key.length === 1 && /[A-Za-z;]/.test(key)) {
                    return key.toLowerCase();
                }
                return null;
            };
            
            const convertedKey1 = convertKey(key1);
            const convertedKey2 = convertKey(key2);
            
            // 只有当两个键都能转换时才返回有效的当量键
            if (convertedKey1 !== null && convertedKey2 !== null) {
                return convertedKey1 + convertedKey2;
            }
            
            return null;
        }

        /**
         * 处理修饰键的位置检测
         * 我们要严格区分左右修饰键，
         * 例如左Shift和右Shift是不同的按键。
         * 这样可以更准确地反映按键的使用频率和热力分布。
         * 并且了解左右手的实际负荷。
         */
        recordKeyWithLocation(event) {
            const key = event.key;
            let normalizedKey = this.normalizeKey(key);
            
            // 严格区分左右修饰键
            if (key === 'Shift') {
                normalizedKey = event.location === 1 ? 'LShift' : 'RShift';
            } else if (key === 'Control') {
                normalizedKey = event.location === 1 ? 'LCtrl' : 'RCtrl';
            } else if (key === 'Alt') {
                normalizedKey = event.location === 1 ? 'LAlt' : 'RAlt';
            } else if (key === 'Meta') {
                normalizedKey = event.location === 1 ? 'LCmd' : 'RCmd';
            }
            
            if (normalizedKey) {
                // 记录单个按键频率
                this.keyStats[normalizedKey] = (this.keyStats[normalizedKey] || 0) + 1;
                this.maxFrequency = Math.max(this.maxFrequency, this.keyStats[normalizedKey]);
                
                // 记录按键对频率
                this.recordKeyPair(normalizedKey);
                
                this.saveKeyStats();
                this.updateDisplay();
            }
        }

        /**
         * 记录按键
         */
        recordKey(key) {
            // 将按键转换为大写以统一处理
            const normalizedKey = this.normalizeKey(key);
            
            if (normalizedKey) {
                // 记录单个按键频率
                this.keyStats[normalizedKey] = (this.keyStats[normalizedKey] || 0) + 1;
                this.maxFrequency = Math.max(this.maxFrequency, this.keyStats[normalizedKey]);
                
                // 记录按键对频率
                this.recordKeyPair(normalizedKey);
                
                this.saveKeyStats();
                this.updateDisplay();
            }
        }

        /**
         * 标准化按键名称
         */
        normalizeKey(key) {
            // 特殊键名映射
            const keyMap = {
                ' ': 'Space',
                'Enter': 'Enter',
                'Backspace': 'Backspace',
                'Tab': 'Tab',
                'CapsLock': 'Caps',
                'Escape': 'Esc'
            };

            if (keyMap[key]) {
                return keyMap[key];
            }

            // 字母、数字、符号直接使用大写
            if (key.length === 1) {
                return key.toUpperCase();
            }

            return null;
        }

        /**
         * 初始化热力图容器
         */
        init() {
            this.createContainer();
            this.createKeyboard();
            this.updateDisplay();
        }

        /**
         * 创建热力图容器
         */
        createContainer() {
            const container = document.createElement('div');
            container.className = 'key-heatmap-container';
            container.innerHTML = `
                <div class="key-heatmap-header">
                    <h3>按键频率热力图</h3>
                    <div class="key-heatmap-controls">
                        <button class="key-heatmap-export" onclick="keyHeatmap.exportStats()">导出数据</button>
                        <button class="key-heatmap-import" onclick="keyHeatmap.importStats()">导入数据(增量)</button>
                        <button class="key-heatmap-reset" onclick="keyHeatmap.resetStats()">重置统计</button>
                    </div>
                </div>
                <input type="file" id="keyHeatmapFileInput" accept=".json" style="display: none;" onchange="keyHeatmap.handleFileImport(event)">
                <div class="key-heatmap-legend">
                    <span>低频</span>
                    <div class="legend-gradient"></div>
                    <span>高频</span>
                </div>
                <div class="key-heatmap-board"></div>
                <div class="key-heatmap-stats">
                    <div class="stats-row">
                        <span>总按键数: <span class="total-keys">0</span></span>
                        <span>最高频数: <span class="max-frequency">0</span></span>
                    </div>
                    <div class="stats-row hand-alternation-stats">
                        <span>左右手互击率: <span class="alternation-rate">0%</span></span>
                        <span>互击次数(空格折半): <span class="alternation-count">0</span></span>
                        <span>同手次数(空格折半): <span class="same-hand-count">0</span></span>
                    </div>
                    <div class="stats-row equiv-stats">
                        <span>频数加权平均当量: <span class="average-equiv">0.00</span></span>
                        <span>有效按键组合数量: <span class="valid-pairs">0</span></span>
                    </div>
                </div>
            `;

            // 找到成绩表格容器并在其后插入热力图
            const tableContainer = document.querySelector('.table-container');
            if (tableContainer) {
                tableContainer.insertAdjacentElement('afterend', container);
            } else {
                // 如果找不到表格容器，则添加到页面底部
                document.body.appendChild(container);
            }
            this.container = container;
        }

        /**
         * 创建键盘布局
         * 和其他的网站的热力图不同，这里宇浩认为应当创建一个完整的键盘布局，
         * 包括所有的字母、数字和符号键，以及常用的功能键。
         * 这样可以更直观地展示按键的使用频率和热力分布。
         * 在输入法界，通常认为左手理论按键频率太大不好，
         * 但是实际上右手的实际按键频率也很高，因为符号区、回车键、回改键
         * 以及其他常用的功能键都在右手区域。
         */
        createKeyboard() {
            const keyboard = this.container.querySelector('.key-heatmap-board');
            
            // 键盘布局定义，严格区分左右修饰键
            const layout = [
                ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
                ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
                ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'],
                ['LShift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'RShift'],
                ['LCtrl', 'LAlt', 'Space', 'RAlt', 'RCtrl']
            ];

            layout.forEach(row => {
                const rowElement = document.createElement('div');
                rowElement.className = 'key-row';
                
                row.forEach(key => {
                    const keyElement = document.createElement('div');
                    keyElement.className = 'key-item';
                    keyElement.dataset.key = key;
                    
                    // 创建按键内容结构：字母 + 百分比
                    keyElement.innerHTML = `
                        <div class="key-label">${key}</div>
                        <div class="key-percentage">0%</div>
                    `;
                    
                    // 设置特殊键的宽度
                    if (key === 'Backspace') keyElement.classList.add('key-wide');
                    else if (key === 'Tab') keyElement.classList.add('key-medium');
                    else if (key === 'Caps') keyElement.classList.add('key-medium');
                    else if (key === 'Enter') keyElement.classList.add('key-medium');
                    else if (key === 'LShift' || key === 'RShift') keyElement.classList.add('key-large');
                    else if (key === 'Space') keyElement.classList.add('key-space');
                    else if (key === 'LCtrl' || key === 'RCtrl' || key === 'LAlt' || key === 'RAlt') keyElement.classList.add('key-small');
                    
                    rowElement.appendChild(keyElement);
                });
                
                keyboard.appendChild(rowElement);
            });
        }

        /**
         * 更新热力图显示
         */
        updateDisplay() {
            if (!this.container) return;

            const totalKeys = Object.values(this.keyStats).reduce((sum, count) => sum + count, 0);
            this.container.querySelector('.total-keys').textContent = totalKeys.toLocaleString();
            this.container.querySelector('.max-frequency').textContent = this.maxFrequency.toLocaleString();

            // 计算并更新左右手互击率
            const handStats = this.calculateHandAlternationRate();
            const alternationRateElement = this.container.querySelector('.alternation-rate');
            const alternationCountElement = this.container.querySelector('.alternation-count');
            const sameHandCountElement = this.container.querySelector('.same-hand-count');
            
            if (alternationRateElement) {
                alternationRateElement.textContent = `${handStats.rate}%`;
            }
            if (alternationCountElement) {
                alternationCountElement.textContent = handStats.alternating.toLocaleString();
            }
            if (sameHandCountElement) {
                sameHandCountElement.textContent = handStats.sameHand.toLocaleString();
            }

            // 计算并更新当量信息
            const equivStats = this.calculateWeightedEquivalent();
            const averageEquivElement = this.container.querySelector('.average-equiv');
            const validPairsElement = this.container.querySelector('.valid-pairs');
            
            if (averageEquivElement) {
                averageEquivElement.textContent = equivStats.averageEquiv.toFixed(2);
            }
            if (validPairsElement) {
                validPairsElement.textContent = equivStats.totalValidPairs.toLocaleString();
            }

            // 更新每个按键的热力图显示
            this.container.querySelectorAll('.key-item').forEach(keyElement => {
                const key = keyElement.dataset.key;
                const frequency = this.keyStats[key] || 0;
                const intensity = this.maxFrequency > 0 ? frequency / this.maxFrequency : 0;
                const percentage = totalKeys > 0 ? ((frequency / totalKeys) * 100).toFixed(1) : '0.0';
                
                // 设置热力图颜色
                keyElement.style.setProperty('--intensity', intensity);
                keyElement.setAttribute('title', `${key}: ${frequency} 次 (${percentage}%)`);
                
                // 更新百分比显示
                const percentageElement = keyElement.querySelector('.key-percentage');
                if (percentageElement) {
                    percentageElement.textContent = `${percentage}%`;
                }
            });
        }

        /**
         * 导出统计数据
         */
        exportStats() {
            const totalKeyPairs = Object.values(this.keyPairStats).reduce((sum, count) => sum + count, 0);
            const handStats = this.calculateHandAlternationRate();
            const equivStats = this.calculateWeightedEquivalent();
            
            const data = {
                stats: this.keyStats,
                keyPairStats: this.keyPairStats,
                handAlternationStats: handStats, // 新增：左右手互击率数据
                equivalentStats: equivStats, // 新增：当量统计数据
                maxFrequency: this.maxFrequency,
                totalKeys: Object.values(this.keyStats).reduce((sum, count) => sum + count, 0),
                totalKeyPairs: totalKeyPairs,
                exportTime: new Date().toISOString(),
                version: '1.3', // 版本升级，表示包含当量数据
                website: 'https://genda.shurufa.app',
                description: '按鍵統計數據（包含左右手互擊率分析和當量分析）',
            };

            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `genda.shurufa.app-key-stats-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(link.href);
        }

        /**
         * 导入统计数据
         */
        importStats() {
            document.getElementById('keyHeatmapFileInput').click();
        }

        /**
         * 处理文件导入
         */
        handleFileImport(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.stats && typeof data.stats === 'object') {
                        // 合并单键统计数据
                        Object.keys(data.stats).forEach(key => {
                            this.keyStats[key] = (this.keyStats[key] || 0) + data.stats[key];
                        });
                        
                        // 合并按键对统计数据
                        if (data.keyPairStats && typeof data.keyPairStats === 'object') {
                            Object.keys(data.keyPairStats).forEach(pair => {
                                this.keyPairStats[pair] = (this.keyPairStats[pair] || 0) + data.keyPairStats[pair];
                            });
                        }
                        
                        // 重新计算最大频率
                        this.maxFrequency = Object.keys(this.keyStats).length > 0 
                            ? Math.max(...Object.values(this.keyStats)) 
                            : 1;
                        
                        this.saveKeyStats();
                        this.updateDisplay();
                        
                        alert('数据导入成功了哟！开心开心！不过注意一下，导入数据没有覆盖现有数据，而是增量合并哦！');
                    } else {
                        alert('文件格式错误了哟！');
                    }
                } catch (error) {
                    alert('文件解析失败：' + error.message);
                }
            };
            
            reader.readAsText(file);
            
            // 清除文件输入，允许重复选择同一文件
            event.target.value = '';
        }

        /**
         * 重置统计数据
         */
        resetStats() {
            if (confirm('你确定要重置所有按键统计数据吗？最好先备份一下数据哦！')) {
                this.keyStats = {};
                this.keyPairStats = {}; // 同时清空按键对数据
                this.maxFrequency = 1;
                this.lastKey = null; // 重置上一个按键记录
                this.saveKeyStats();
                this.updateDisplay();
            }
        }

        /**
         * 获取按键统计摘要
         */
        getStatsSummary() {
            const totalKeys = Object.values(this.keyStats).reduce((sum, count) => sum + count, 0);
            const totalKeyPairs = Object.values(this.keyPairStats).reduce((sum, count) => sum + count, 0);
            const handStats = this.calculateHandAlternationRate();
            const topKeys = Object.entries(this.keyStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);
            const topKeyPairs = Object.entries(this.keyPairStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);
            
            return {
                totalKeys,
                totalKeyPairs,
                handAlternationStats: handStats,
                topKeys,
                topKeyPairs,
                maxFrequency: this.maxFrequency
            };
        }

        /**
         * 调试方法：在控制台显示按键对统计
         */
        debugKeyPairs() {
            console.log('=== 按键对频率统计 ===');
            console.log('总按键对数量:', Object.values(this.keyPairStats).reduce((sum, count) => sum + count, 0));
            
            const sortedPairs = Object.entries(this.keyPairStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 20);
            
            console.log('前20个最频繁的按键对:');
            sortedPairs.forEach(([pair, count], index) => {
                console.log(`${index + 1}. ${pair}: ${count}次`);
            });
            
            return sortedPairs;
        }
    }

    return KeyHeatmap;
});